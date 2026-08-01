import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Pool, PoolClient } from "pg";
import { withTransaction } from "@chefmate/database";
import {
  audit,
  createSession,
  dataEnvelope,
  fetchUserById,
  hashToken,
  HttpRouteError,
  checkRateLimit,
  nullableStringField,
  problemFromError,
  randomToken,
  readCookie,
  recordBody,
  requireRole,
  requestRateLimitKey,
  resetRateLimit,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  stringArrayField,
  stringField,
  validateEmail,
  type AuthenticatedUser,
  type Db,
  type SessionCookieOptions,
} from "../auth/session.js";

interface KmsLike {
  readonly name: string;
  activeKeyVersionId(): Promise<string>;
  encrypt(
    plaintext: Uint8Array,
    context: Readonly<Record<string, string>>,
  ): Promise<{ readonly ciphertext: Uint8Array; readonly keyVersionId: string }>;
  decrypt(
    value: { readonly ciphertext: Uint8Array; readonly keyVersionId: string },
    context: Readonly<Record<string, string>>,
  ): Promise<Uint8Array>;
}

export interface RegisterPlatformRoutesOptions {
  readonly pool: Pool;
  readonly cookies: SessionCookieOptions;
  readonly kms?: KmsLike;
  readonly webAppBaseUrl: string;
}

type ApplicationStatus =
  "APPLIED" | "INTERVIEW_SCHEDULED" | "INTERVIEW_CONDUCTED" | "APPROVED" | "INVITED" | "REJECTED";

type BookingStatus =
  | "REQUESTED"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "AWAITING_CHEF"
  | "CHEF_MATCHED"
  | "EN_ROUTE"
  | "CANCELLED"
  | "COMPLETED";

const EMAIL_EVENT = "communication.email.transactional.v1";
const WHATSAPP_EVENT = "communication.whatsapp.template.v1";
const MAGIC_LINK_RATE_LIMIT = { maxAttempts: 6, windowMs: 15 * 60 * 1_000 } as const;
const CHEF_APPLICATION_RATE_LIMIT = { maxAttempts: 8, windowMs: 60 * 60 * 1_000 } as const;
const SURVEY_TOKEN_RATE_LIMIT = { maxAttempts: 20, windowMs: 15 * 60 * 1_000 } as const;
const APPLICATION_STATUSES = [
  "APPLIED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_CONDUCTED",
  "APPROVED",
  "INVITED",
  "REJECTED",
] as const;
const APPLICATION_STATUS_SET = new Set<string>(APPLICATION_STATUSES);

function fail(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  const problem = problemFromError(request, error);
  if (problem.status === 500) request.log.error({ err: error }, "platform route failed");
  return reply.status(problem.status).send(problem);
}

function iso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dateOnly(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function floorUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function parseDateQueryParam(query: Record<string, unknown>, key: "from" | "to"): Date | null {
  const raw = query[key];
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be an ISO date or timestamp.`);
  }
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be an ISO date or timestamp.`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return floorUtcDay(parsed);
  }
  return parsed;
}

function parseTopChefsLimit(query: Record<string, unknown>): number {
  const raw = query.topChefsLimit;
  if (raw === undefined || raw === null || raw === "") return 5;
  if (typeof raw !== "string" && typeof raw !== "number") {
    throw new HttpRouteError(400, "VALIDATION_FAILED", "topChefsLimit must be a number.");
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new HttpRouteError(
      400,
      "VALIDATION_FAILED",
      "topChefsLimit must be an integer between 1 and 50.",
    );
  }
  return parsed;
}

function resolveDashboardRange(query: Record<string, unknown>): {
  from: Date;
  toExclusive: Date;
} {
  const from = parseDateQueryParam(query, "from");
  const to = parseDateQueryParam(query, "to");
  const now = new Date();
  const defaultFrom = floorUtcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const rangeFrom = from ?? defaultFrom;
  const rangeTo = to ? floorUtcDay(to) : now;
  if (to) {
    rangeTo.setUTCDate(rangeTo.getUTCDate() + 1);
  }
  if (rangeFrom >= rangeTo) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", "from must be before to.");
  }
  return { from: rangeFrom, toExclusive: rangeTo };
}

function topChefsRowsToDto(
  rows: Array<{
    user_id: string;
    display_name: string;
    email: string;
    completed_jobs: string;
    completed_revenue: string;
    payable_revenue: string;
  }>,
) {
  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    completedJobsCount: Number(row.completed_jobs),
    completedRevenueCents: Number(row.completed_revenue),
    chefPayableCents: Number(row.payable_revenue),
  }));
}

function chefSessionToken(request: FastifyRequest): string {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) throw new HttpRouteError(401, "UNAUTHENTICATED", "Authentication is required.");
  return token;
}

function parseApplicationStatus(value: unknown): ApplicationStatus | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !APPLICATION_STATUS_SET.has(value)) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", "status is invalid.");
  }
  return value as ApplicationStatus;
}

function optionalNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be a number or null.`);
  }
  return value;
}

function optionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be a boolean.`);
  }
  return value;
}

function optionalJsonRecord(
  body: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = body[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new HttpRouteError(400, "VALIDATION_FAILED", `${key} must be an object or null.`);
  }
  return value as Record<string, unknown>;
}

async function upsertCommunication(
  client: PoolClient,
  input: {
    readonly channel: "EMAIL" | "WHATSAPP";
    readonly recipient: string;
    readonly subject?: string | null;
    readonly templateKey: string;
    readonly bodyPreview: string;
    readonly deliveryBodyPreview?: string;
    readonly relatedBookingId?: string | null;
    readonly relatedUserId?: string | null;
    readonly metadata?: Record<string, unknown> | null;
    readonly deliveryMetadata?: Record<string, unknown> | null;
    readonly provider?: string | null;
    readonly queue?: boolean;
    readonly correlationId: string;
  },
): Promise<string> {
  const suppression = await client.query<{ recipient: string }>(
    `SELECT recipient FROM app.communication_suppressions
      WHERE channel = $1 AND lower(recipient) = lower($2)`,
    [input.channel, input.recipient],
  );

  const shouldQueue = input.queue !== false && !suppression.rows[0];
  const status = shouldQueue ? "QUEUED" : "SKIPPED";
  const log = await client.query<{ id: string }>(
    `INSERT INTO app.communication_logs
       (channel, status, recipient, subject, template_key, body_preview,
        provider, related_booking_id, related_user_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING id::text`,
    [
      input.channel,
      status,
      input.recipient,
      input.subject ?? null,
      input.templateKey,
      input.bodyPreview,
      input.provider ?? null,
      input.relatedBookingId ?? null,
      input.relatedUserId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
  const id = log.rows[0]?.id;
  if (!id) throw new Error("Communication insert failed.");

  if (shouldQueue) {
    const eventType = input.channel === "EMAIL" ? EMAIL_EVENT : WHATSAPP_EVENT;
    await client.query(
      `INSERT INTO app.outbox_events
         (topic, event_type, aggregate_type, aggregate_id, correlation_id, payload)
       VALUES ($1, $1, 'communication', $2, $3, $4::jsonb)`,
      [
        eventType,
        id,
        input.correlationId,
        JSON.stringify({
          communicationLogId: id,
          channel: input.channel,
          recipient: input.recipient,
          subject: input.subject ?? null,
          templateKey: input.templateKey,
          bodyPreview: input.deliveryBodyPreview ?? input.bodyPreview,
          metadata: input.deliveryMetadata ?? input.metadata ?? {},
        }),
      ],
    );
  }

  return id;
}
async function notify(
  client: PoolClient,
  userId: string,
  kind: string,
  title: string,
  body: string,
  data: Record<string, unknown> | null,
): Promise<void> {
  await client.query(
    `INSERT INTO app.notifications (user_id, kind, title, body, data)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [userId, kind, title, body, data === null ? null : JSON.stringify(data)],
  );
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

async function applicationDto(db: Db, applicationId: string) {
  const result = await db.query<{
    id: string;
    full_name: string;
    email: string;
    phone: string;
    city: string | null;
    service_areas: string[];
    experience: string;
    status: ApplicationStatus;
    interview_scheduled_at: Date | null;
    interview_conducted_at: Date | null;
    admin_notes: string | null;
    invited_user_id: string | null;
    invited_at: Date | null;
    rejected_at: Date | null;
    applied_at: Date;
    updated_at: Date;
  }>("SELECT * FROM app.chef_applications WHERE id = $1", [applicationId]);
  const row = result.rows[0];
  if (!row) throw new HttpRouteError(404, "NOT_FOUND", "Chef application not found.");
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    serviceAreas: row.service_areas,
    experience: row.experience,
    status: row.status,
    interviewScheduledAt: iso(row.interview_scheduled_at),
    interviewConductedAt: iso(row.interview_conducted_at),
    adminNotes: row.admin_notes,
    invitedUserId: row.invited_user_id,
    invitedAt: iso(row.invited_at),
    rejectedAt: iso(row.rejected_at),
    appliedAt: row.applied_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function bankPreview(
  db: Db,
  sessionToken: string,
  kms: KmsLike | undefined,
  expectedUserId: string,
) {
  const result = await db.query<{
    user_id: string;
    account_holder_ciphertext: Buffer;
    bank_name_ciphertext: Buffer;
    branch_code_ciphertext: Buffer;
    account_type_ciphertext: Buffer | null;
    account_number_last4: string;
    key_version_id: string;
    updated_at: Date;
  }>(
    `SELECT user_id::text, account_holder_ciphertext, bank_name_ciphertext, branch_code_ciphertext,
            account_type_ciphertext, account_number_last4, key_version_id, updated_at
       FROM app.get_chef_bank_account($1)`,
    [sessionToken],
  );
  const row = result.rows[0];
  if (!row || row.user_id !== expectedUserId) return null;
  if (!kms) {
    return {
      accountHolder: "Encrypted",
      bankName: "Encrypted",
      branchCode: "Encrypted",
      accountNumberLast4: row.account_number_last4,
      accountType: null,
      updatedAt: row.updated_at.toISOString(),
    };
  }
  const context = { purpose: "chef-bank-account", userId: row.user_id };
  const decrypt = async (ciphertext: Buffer | null): Promise<string | null> => {
    if (ciphertext === null) return null;
    const plaintext = await kms.decrypt({ ciphertext, keyVersionId: row.key_version_id }, context);
    return Buffer.from(plaintext).toString("utf8");
  };
  return {
    accountHolder: await decrypt(row.account_holder_ciphertext),
    bankName: await decrypt(row.bank_name_ciphertext),
    branchCode: await decrypt(row.branch_code_ciphertext),
    accountNumberLast4: row.account_number_last4,
    accountType: await decrypt(row.account_type_ciphertext),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function chefProfileDto(
  db: Db,
  userId: string,
  kms: KmsLike | undefined,
  sessionToken?: string,
) {
  const result = await db.query<{
    user_id: string;
    display_name: string;
    email: string;
    is_available: boolean;
    service_area: string | null;
    service_areas: string[];
    bio: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    max_travel_km: number;
    availability: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT p.user_id::text, u.display_name, u.email::text, p.is_available, p.service_area,
            p.service_areas, p.bio, p.latitude, p.longitude, p.max_travel_km,
            p.availability, p.created_at, p.updated_at
       FROM app.chef_profiles p
       JOIN app.users u ON u.id = p.user_id
      WHERE p.user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    const user = await fetchUserById(db, userId);
    if (!user) throw new HttpRouteError(404, "NOT_FOUND", "Chef profile not found.");
    return {
      userId,
      displayName: user.displayName,
      email: user.email,
      isAvailable: false,
      serviceArea: null,
      serviceAreas: [],
      bio: null,
      latitude: null,
      longitude: null,
      maxTravelKm: 20,
      availability: null,
      bankAccount: sessionToken ? await bankPreview(db, sessionToken, kms, userId) : null,
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    };
  }
  return {
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    isAvailable: row.is_available,
    serviceArea: row.service_area,
    serviceAreas: row.service_areas,
    bio: row.bio,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    maxTravelKm: row.max_travel_km,
    availability: row.availability,
    bankAccount: sessionToken ? await bankPreview(db, sessionToken, kms, userId) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function createChefOffersForBooking(
  client: PoolClient,
  bookingId: string,
  correlationId: string,
): Promise<void> {
  const booking = await client.query<{
    id: string;
    reference: string;
    address: Record<string, unknown>;
    scheduled_date: Date;
    time_slot: string;
    main_slug: string;
    chef_payable_cents: number;
  }>("SELECT * FROM app.bookings WHERE id = $1", [bookingId]);
  const row = booking.rows[0];
  if (!row || row.chef_payable_cents <= 0) return;
  const area = typeof row.address.area === "string" ? row.address.area : null;
  if (!area) return;

  const eligible = await client.query<{
    user_id: string;
    email: string;
    display_name: string;
  }>(
    `SELECT p.user_id::text, u.email::text, u.display_name
       FROM app.chef_profiles p
       JOIN app.users u ON u.id = p.user_id
      WHERE p.is_available
        AND u.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1 FROM app.user_roles r WHERE r.user_id = u.id AND r.role = 'CHEF'
        )
        AND (
          lower(p.service_area) = lower($1)
          OR p.service_areas @> ARRAY[$1]::text[]
          OR EXISTS (SELECT 1 FROM unnest(p.service_areas) AS area WHERE lower(area) = lower($1))
        )
      ORDER BY p.updated_at ASC, p.user_id ASC
      LIMIT 10`,
    [area],
  );

  let rank = 1;
  for (const chef of eligible.rows) {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO app.chef_offers
         (booking_id, chef_user_id, rank, chef_payout_cents, expires_at)
       VALUES ($1, $2, $3, $4, now() + interval '30 minutes')
       ON CONFLICT (booking_id, chef_user_id) DO NOTHING
       RETURNING id::text`,
      [bookingId, chef.user_id, rank, row.chef_payable_cents],
    );
    const offerId = inserted.rows[0]?.id;
    if (offerId) {
      const payout = money(row.chef_payable_cents);
      await notify(
        client,
        chef.user_id,
        "CHEF_OFFER",
        "New ChefMate job",
        `You receive ${payout}.`,
        {
          offerId,
          bookingId,
          reference: row.reference,
        },
      );
      await upsertCommunication(client, {
        channel: "EMAIL",
        recipient: chef.email,
        subject: `ChefMate job ${row.reference}`,
        templateKey: "chef.booking.offer",
        bodyPreview: `New ChefMate job in ${area}. You receive ${payout}.`,
        relatedBookingId: bookingId,
        relatedUserId: chef.user_id,
        metadata: { offerId, reference: row.reference },
        correlationId,
      });
    }
    rank += 1;
  }
}

async function offerDto(db: Db, offerId: string, chefUserId: string) {
  const result = await db.query<{
    id: string;
    booking_id: string;
    chef_user_id: string;
    status: string;
    rank: number;
    distance_km: string | number | null;
    chef_payout_cents: number;
    expires_at: Date;
    created_at: Date;
    reference: string;
    main_slug: string;
    scheduled_date: Date;
    time_slot: string;
    address: Record<string, unknown>;
  }>(
    `SELECT o.id::text, o.booking_id::text, o.chef_user_id::text, o.status, o.rank,
            o.distance_km, o.chef_payout_cents, o.expires_at, o.created_at,
            b.reference, b.main_slug, b.scheduled_date, b.time_slot, b.address
       FROM app.chef_offers o
       JOIN app.bookings b ON b.id = o.booking_id
      WHERE o.id = $1 AND o.chef_user_id = $2`,
    [offerId, chefUserId],
  );
  const row = result.rows[0];
  if (!row) throw new HttpRouteError(404, "NOT_FOUND", "Chef offer not found.");
  return {
    id: row.id,
    bookingRequestId: row.booking_id,
    chefUserId: row.chef_user_id,
    status: row.status,
    rank: row.rank,
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    chefPayoutCents: row.chef_payout_cents,
    expiresAt: row.expires_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    booking: {
      id: row.booking_id,
      reference: row.reference,
      mainName: row.main_slug,
      scheduledDate: dateOnly(row.scheduled_date),
      timeSlot: row.time_slot,
      serviceArea: typeof row.address.area === "string" ? row.address.area : null,
    },
  };
}

async function bookingDto(db: Db, bookingId: string, chefUserId: string) {
  const result = await db.query<{
    id: string;
    reference: string;
    status: BookingStatus;
    source: string;
    idempotency_key: string;
    request_fingerprint: string;
    customer_id: string | null;
    main_slug: string;
    custom_request: string | null;
    scheduled_date: Date;
    time_slot: string;
    address: Record<string, unknown>;
    contact: Record<string, unknown> | null;
    goal_id: string | null;
    gift_code: string | null;
    created_at: Date;
  }>(
    `SELECT b.id::text, b.reference, b.status, b.source, b.idempotency_key,
            b.request_fingerprint, b.customer_id::text, b.main_slug, b.custom_request,
            b.scheduled_date, b.time_slot, b.address, b.contact, b.goal_id, b.gift_code,
            b.created_at
       FROM app.bookings b
       JOIN app.booking_assignments a ON a.booking_id = b.id
      WHERE b.id = $1 AND a.chef_user_id = $2`,
    [bookingId, chefUserId],
  );
  const row = result.rows[0];
  if (!row) throw new HttpRouteError(404, "NOT_FOUND", "Chef booking not found.");
  const transitions = await db.query<{
    id: string;
    from_status: BookingStatus | null;
    to_status: BookingStatus;
    actor: "SYSTEM" | "CUSTOMER" | "ADMIN" | "CHEF";
    actor_user_id: string | null;
    note: string | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `SELECT id::text, from_status, to_status, actor, actor_user_id::text, note, metadata, created_at
       FROM app.booking_transitions
      WHERE booking_id = $1
      ORDER BY created_at ASC`,
    [bookingId],
  );
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    type: "CHEFMATE_BOOKING",
    source: "LANDING_ORDER_FLOW",
    idempotencyKey: row.idempotency_key,
    idempotencyPayloadHash: row.request_fingerprint,
    customerId: row.customer_id,
    mainMealSlug: row.main_slug,
    mainName: row.main_slug,
    customRequest: row.custom_request,
    scheduledDate: dateOnly(row.scheduled_date),
    timeSlot: row.time_slot,
    estate: typeof row.address.estate === "string" ? row.address.estate : null,
    unit: typeof row.address.unit === "string" ? row.address.unit : null,
    street: typeof row.address.street === "string" ? row.address.street : "",
    serviceArea: typeof row.address.area === "string" ? row.address.area : null,
    latitude: typeof row.address.latitude === "number" ? row.address.latitude : null,
    longitude: typeof row.address.longitude === "number" ? row.address.longitude : null,
    contactName: typeof row.contact?.name === "string" ? row.contact.name : null,
    contactEmail: typeof row.contact?.email === "string" ? row.contact.email : null,
    contactPhone: typeof row.contact?.phone === "string" ? row.contact.phone : null,
    goalId: row.goal_id,
    promotionCodeHash: row.gift_code ? hashToken(row.gift_code) : null,
    createdAt: row.created_at.toISOString(),
    transitions: transitions.rows.map((transition) => ({
      id: transition.id,
      fromStatus: transition.from_status,
      toStatus: transition.to_status,
      actor: transition.actor,
      actorUserId: transition.actor_user_id,
      note: transition.note,
      metadata: transition.metadata,
      createdAt: transition.created_at.toISOString(),
    })),
  };
}

async function transitionBooking(
  client: PoolClient,
  bookingId: string,
  from: BookingStatus,
  to: BookingStatus,
  actor: "SYSTEM" | "CUSTOMER" | "ADMIN" | "CHEF",
  actorUserId: string | null,
  note: string | null,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  await client.query("UPDATE app.bookings SET status = $1, updated_at = now() WHERE id = $2", [
    to,
    bookingId,
  ]);
  await client.query(
    `INSERT INTO app.booking_transitions
       (booking_id, from_status, to_status, actor, actor_user_id, note, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [bookingId, from, to, actor, actorUserId, note, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function registerPlatformRoutes(
  app: FastifyInstance,
  options: RegisterPlatformRoutesOptions,
): Promise<void> {
  const { pool, cookies, kms } = options;

  app.post("/api/v1/chef-applications", async (request, reply) => {
    try {
      const body = recordBody(request.body);
      const fullName = stringField(body, "fullName", { min: 2, max: 160 });
      const email = validateEmail(body.email);
      const phone = stringField(body, "phone", { min: 5, max: 50 });
      const city = nullableStringField(body, "city");
      const serviceAreas = stringArrayField(body, "serviceAreas");
      const experience = stringField(body, "experience", { min: 20, max: 5_000 });
      await Promise.all([
        checkRateLimit(
          pool,
          requestRateLimitKey(request, "chef-application:submit:ip"),
          CHEF_APPLICATION_RATE_LIMIT,
        ),
        checkRateLimit(
          pool,
          requestRateLimitKey(request, "chef-application:submit:email", email),
          CHEF_APPLICATION_RATE_LIMIT,
        ),
      ]);

      const created = await withTransaction(pool, async (client) => {
        const insert = await client.query<{ id: string }>(
          `INSERT INTO app.chef_applications
             (full_name, email, phone, city, service_areas, experience)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id::text`,
          [fullName, email, phone, city, serviceAreas, experience],
        );
        const id = insert.rows[0]?.id;
        if (!id) throw new Error("Chef application insert failed.");
        await audit(client, null, "chef_application.submitted", "chef_application", id, { email });
        return applicationDto(client, id);
      });
      return reply.status(201).send(dataEnvelope(request, created));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post("/api/v1/chef/magic-login", async (request, reply) => {
    try {
      const body = recordBody(request.body);
      const token = stringField(body, "token", { min: 20, max: 500 });
      const tokenHash = hashToken(token);
      await checkRateLimit(
        pool,
        requestRateLimitKey(request, "chef:magic-login:ip"),
        MAGIC_LINK_RATE_LIMIT,
      );
      await checkRateLimit(
        pool,
        requestRateLimitKey(request, "chef:magic-login:token", tokenHash),
        MAGIC_LINK_RATE_LIMIT,
      );
      const sessionToken = randomToken();
      const user = await withTransaction(pool, async (client) => {
        const result = await client.query<{ id: string; user_id: string }>(
          `SELECT id::text, user_id::text
             FROM app.magic_tokens
            WHERE token_hash = $1
              AND purpose = 'CHEF_PORTAL_INVITE'
              AND consumed_at IS NULL
              AND expires_at > now()
            FOR UPDATE`,
          [tokenHash],
        );
        const row = result.rows[0];
        if (!row) {
          throw new HttpRouteError(
            401,
            "INVALID_MAGIC_LINK",
            "This chef portal link is invalid or expired.",
          );
        }
        await client.query("UPDATE app.magic_tokens SET consumed_at = now() WHERE id = $1", [
          row.id,
        ]);
        await createSession(client, row.user_id, sessionToken, request);
        await audit(client, row.user_id, "chef.magic_link_consumed", "user", row.user_id);
        const next = await fetchUserById(client, row.user_id);
        if (!next) throw new Error("Magic-link user lookup failed.");
        return next;
      });
      setSessionCookie(reply, sessionToken, cookies);
      await resetRateLimit(pool, requestRateLimitKey(request, "chef:magic-login:token", tokenHash));
      return reply.status(200).send(dataEnvelope(request, { user }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/chef/profile", async (request, reply) => {
    try {
      const user = await requireRole(request, pool, ["CHEF"]);
      return reply
        .status(200)
        .send(
          dataEnvelope(
            request,
            await chefProfileDto(pool, user.id, kms, chefSessionToken(request)),
          ),
        );
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.put("/api/v1/chef/profile", async (request, reply) => {
    try {
      const user = await requireRole(request, pool, ["CHEF"]);
      const body = recordBody(request.body);
      const isAvailable = optionalBoolean(body, "isAvailable") ?? false;
      const serviceArea = nullableStringField(body, "serviceArea");
      const serviceAreas = stringArrayField(body, "serviceAreas");
      const bio = nullableStringField(body, "bio");
      const latitude = optionalNumber(body, "latitude");
      const longitude = optionalNumber(body, "longitude");
      const maxTravelKmValue = body.maxTravelKm;
      const maxTravelKm =
        typeof maxTravelKmValue === "number" && Number.isInteger(maxTravelKmValue)
          ? maxTravelKmValue
          : 20;
      const availability = optionalJsonRecord(body, "availability");
      const profile = await withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO app.chef_profiles
             (user_id, is_available, service_area, service_areas, bio, latitude, longitude, max_travel_km, availability)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
           ON CONFLICT (user_id) DO UPDATE SET
             is_available = EXCLUDED.is_available,
             service_area = EXCLUDED.service_area,
             service_areas = EXCLUDED.service_areas,
             bio = EXCLUDED.bio,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             max_travel_km = EXCLUDED.max_travel_km,
             availability = EXCLUDED.availability,
             updated_at = now()`,
          [
            user.id,
            isAvailable,
            serviceArea,
            serviceAreas,
            bio,
            latitude,
            longitude,
            maxTravelKm,
            availability ? JSON.stringify(availability) : null,
          ],
        );
        await audit(client, user.id, "chef.profile_updated", "user", user.id);
        return chefProfileDto(client, user.id, kms, chefSessionToken(request));
      });
      return reply.status(200).send(dataEnvelope(request, profile));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.put("/api/v1/chef/bank-details", async (request, reply) => {
    try {
      if (!kms) {
        throw new HttpRouteError(
          503,
          "KMS_NOT_CONFIGURED",
          "Bank-detail encryption is not configured.",
          true,
        );
      }
      const user = await requireRole(request, pool, ["CHEF"]);
      const body = recordBody(request.body);
      const accountHolder = stringField(body, "accountHolder", { min: 2, max: 160 });
      const bankName = stringField(body, "bankName", { min: 2, max: 160 });
      const branchCode = stringField(body, "branchCode", { min: 3, max: 20 });
      const accountNumber = stringField(body, "accountNumber", { min: 5, max: 40 });
      const accountType = nullableStringField(body, "accountType");
      const context = { purpose: "chef-bank-account", userId: user.id };
      const encrypt = async (
        value: string | null,
      ): Promise<{ readonly ciphertext: Buffer; readonly keyVersionId: string } | null> => {
        if (value === null) return null;
        const encrypted = await kms.encrypt(Buffer.from(value, "utf8"), context);
        return {
          ciphertext: Buffer.from(encrypted.ciphertext),
          keyVersionId: encrypted.keyVersionId,
        };
      };
      const encrypted = {
        accountHolder: await encrypt(accountHolder),
        bankName: await encrypt(bankName),
        branchCode: await encrypt(branchCode),
        accountNumber: await encrypt(accountNumber),
        accountType: await encrypt(accountType),
      };
      const keyVersionIds = Object.values(encrypted)
        .map((value) => value?.keyVersionId)
        .filter((value): value is string => typeof value === "string");
      const keyVersionId = keyVersionIds[0];
      if (!keyVersionId || keyVersionIds.some((value) => value !== keyVersionId)) {
        throw new Error("KMS returned inconsistent key versions.");
      }
      const preview = await withTransaction(pool, async (client) => {
        await client.query(
          "SELECT * FROM app.upsert_chef_bank_account($1, $2, $3, $4, $5, $6, $7, $8)",
          [
            chefSessionToken(request),
            encrypted.accountHolder?.ciphertext,
            encrypted.bankName?.ciphertext,
            encrypted.branchCode?.ciphertext,
            encrypted.accountNumber?.ciphertext,
            encrypted.accountType?.ciphertext ?? null,
            accountNumber.slice(-4),
            keyVersionId,
          ],
        );
        await audit(client, user.id, "chef.bank_details_updated", "user", user.id, {
          accountNumberLast4: accountNumber.slice(-4),
        });
        return bankPreview(client, chefSessionToken(request), kms, user.id);
      });
      return reply.status(200).send(dataEnvelope(request, preview));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/chef/offers", async (request, reply) => {
    try {
      const user = await requireRole(request, pool, ["CHEF"]);
      const result = await pool.query<{ id: string }>(
        `SELECT id::text
           FROM app.chef_offers
          WHERE chef_user_id = $1 AND status = 'PENDING' AND expires_at > now()
          ORDER BY created_at ASC`,
        [user.id],
      );
      const items = await Promise.all(result.rows.map((row) => offerDto(pool, row.id, user.id)));
      return reply.status(200).send(dataEnvelope(request, { items }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post<{ Params: { offerId: string } }>(
    "/api/v1/chef/offers/:offerId/accept",
    async (request, reply) => {
      try {
        const user = await requireRole(request, pool, ["CHEF"]);
        const ids = await withTransaction(pool, async (client) => {
          const located = await client.query<{ id: string; booking_id: string }>(
            `SELECT id::text, booking_id::text
               FROM app.chef_offers
              WHERE id = $1 AND chef_user_id = $2`,
            [request.params.offerId, user.id],
          );
          const locatedRow = located.rows[0];
          if (!locatedRow) throw new HttpRouteError(404, "NOT_FOUND", "Chef offer not found.");

          const booking = await client.query<{ status: BookingStatus }>(
            "SELECT status FROM app.bookings WHERE id = $1 FOR UPDATE",
            [locatedRow.booking_id],
          );
          const bookingStatus = booking.rows[0]?.status;
          if (!bookingStatus) throw new HttpRouteError(404, "NOT_FOUND", "Chef offer not found.");

          const offers = await client.query<{
            id: string;
            booking_id: string;
            chef_user_id: string;
            status: string;
            expires_at: Date;
            chef_payout_cents: number;
          }>(
            `SELECT id::text, booking_id::text, chef_user_id::text, status, expires_at, chef_payout_cents
               FROM app.chef_offers
              WHERE booking_id = $1
              ORDER BY id
              FOR UPDATE`,
            [locatedRow.booking_id],
          );
          const matchedOffer = offers.rows.find(
            (offerRow) => offerRow.id === locatedRow.id && offerRow.chef_user_id === user.id,
          );
          if (!matchedOffer) throw new HttpRouteError(404, "NOT_FOUND", "Chef offer not found.");
          const row = { ...matchedOffer, booking_status: bookingStatus };
          if (row.status !== "PENDING" || row.expires_at.getTime() <= Date.now()) {
            throw new HttpRouteError(
              409,
              "OFFER_NOT_AVAILABLE",
              "This job offer is no longer available.",
            );
          }
          if (
            row.booking_status === "CHEF_MATCHED" ||
            row.booking_status === "EN_ROUTE" ||
            row.booking_status === "COMPLETED"
          ) {
            throw new HttpRouteError(
              409,
              "BOOKING_ALREADY_ASSIGNED",
              "This job has already been accepted.",
            );
          }
          await client.query(
            "UPDATE app.chef_offers SET status = 'ACCEPTED', accepted_at = now() WHERE id = $1",
            [row.id],
          );
          await client.query(
            `UPDATE app.chef_offers
              SET status = 'WITHDRAWN'
            WHERE booking_id = $1 AND id <> $2 AND status = 'PENDING'`,
            [row.booking_id, row.id],
          );
          await client.query(
            `INSERT INTO app.booking_assignments (booking_id, chef_user_id, accepted_offer_id)
           VALUES ($1, $2, $3)`,
            [row.booking_id, user.id, row.id],
          );
          await client.query("UPDATE app.bookings SET assigned_chef_user_id = $1 WHERE id = $2", [
            user.id,
            row.booking_id,
          ]);
          await transitionBooking(
            client,
            row.booking_id,
            row.booking_status,
            "CHEF_MATCHED",
            "CHEF",
            user.id,
            null,
            {
              offerId: row.id,
            },
          );
          await audit(client, user.id, "chef.offer_accepted", "chef_offer", row.id, {
            bookingId: row.booking_id,
          });
          return { bookingId: row.booking_id, offerId: row.id };
        });
        return reply.status(200).send(
          dataEnvelope(request, {
            booking: await bookingDto(pool, ids.bookingId, user.id),
            offer: await offerDto(pool, ids.offerId, user.id),
          }),
        );
      } catch (error) {
        return fail(request, reply, error);
      }
    },
  );

  app.post<{ Params: { offerId: string } }>(
    "/api/v1/chef/offers/:offerId/decline",
    async (request, reply) => {
      try {
        const user = await requireRole(request, pool, ["CHEF"]);
        await withTransaction(pool, async (client) => {
          const result = await client.query<{ id: string }>(
            `UPDATE app.chef_offers
              SET status = 'DECLINED', declined_at = now()
            WHERE id = $1 AND chef_user_id = $2 AND status = 'PENDING'
            RETURNING id::text`,
            [request.params.offerId, user.id],
          );
          if (!result.rows[0])
            throw new HttpRouteError(404, "NOT_FOUND", "Pending chef offer not found.");
          await audit(client, user.id, "chef.offer_declined", "chef_offer", request.params.offerId);
        });
        return reply.status(204).send();
      } catch (error) {
        return fail(request, reply, error);
      }
    },
  );

  app.get("/api/v1/chef/bookings", async (request, reply) => {
    try {
      const user = await requireRole(request, pool, ["CHEF"]);
      const result = await pool.query<{ id: string }>(
        `SELECT b.id::text
           FROM app.bookings b
           JOIN app.booking_assignments a ON a.booking_id = b.id
          WHERE a.chef_user_id = $1
          ORDER BY b.scheduled_date ASC NULLS LAST, b.created_at DESC`,
        [user.id],
      );
      const items = await Promise.all(result.rows.map((row) => bookingDto(pool, row.id, user.id)));
      return reply.status(200).send(dataEnvelope(request, { items }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  async function chefBookingTransition(
    request: FastifyRequest<{ Params: { bookingId: string } }>,
    reply: FastifyReply,
    to: BookingStatus,
  ) {
    try {
      const user = await requireRole(request, pool, ["CHEF"]);
      const body = request.body === undefined ? {} : recordBody(request.body);
      const note = nullableStringField(body, "note");
      await withTransaction(pool, async (client) => {
        const current = await client.query<{ status: BookingStatus }>(
          `SELECT b.status
             FROM app.bookings b
             JOIN app.booking_assignments a ON a.booking_id = b.id
            WHERE b.id = $1 AND a.chef_user_id = $2
            FOR UPDATE`,
          [request.params.bookingId, user.id],
        );
        const status = current.rows[0]?.status;
        if (!status) throw new HttpRouteError(404, "NOT_FOUND", "Chef booking not found.");
        if (to === "EN_ROUTE" && status !== "CHEF_MATCHED") {
          throw new HttpRouteError(
            409,
            "INVALID_BOOKING_STATE",
            "Only matched bookings can be marked en route.",
          );
        }
        if (to === "COMPLETED" && status !== "EN_ROUTE" && status !== "CHEF_MATCHED") {
          throw new HttpRouteError(
            409,
            "INVALID_BOOKING_STATE",
            "Only active bookings can be completed.",
          );
        }
        await transitionBooking(
          client,
          request.params.bookingId,
          status,
          to,
          "CHEF",
          user.id,
          note,
        );
      });
      return reply
        .status(200)
        .send(dataEnvelope(request, await bookingDto(pool, request.params.bookingId, user.id)));
    } catch (error) {
      return fail(request, reply, error);
    }
  }

  app.post<{ Params: { bookingId: string } }>(
    "/api/v1/chef/bookings/:bookingId/en-route",
    (request, reply) => chefBookingTransition(request, reply, "EN_ROUTE"),
  );

  app.post<{ Params: { bookingId: string } }>(
    "/api/v1/chef/bookings/:bookingId/complete",
    async (request, reply) => {
      try {
        const user = await requireRole(request, pool, ["CHEF"]);
        const body = request.body === undefined ? {} : recordBody(request.body);
        const note = nullableStringField(body, "note");
        const result = await withTransaction(pool, async (client) => {
          const booking = await client.query<{
            id: string;
            reference: string;
            status: BookingStatus;
            total_cents: number;
            chef_payable_cents: number;
            platform_revenue_cents: number;
            contact: Record<string, unknown> | null;
          }>(
            `SELECT b.id::text, b.reference, b.status, b.total_cents, b.chef_payable_cents,
                  b.platform_revenue_cents, b.contact
             FROM app.bookings b
             JOIN app.booking_assignments a ON a.booking_id = b.id
            WHERE b.id = $1 AND a.chef_user_id = $2
            FOR UPDATE`,
            [request.params.bookingId, user.id],
          );
          const row = booking.rows[0];
          if (!row) throw new HttpRouteError(404, "NOT_FOUND", "Chef booking not found.");
          if (row.status !== "EN_ROUTE" && row.status !== "CHEF_MATCHED") {
            throw new HttpRouteError(
              409,
              "INVALID_BOOKING_STATE",
              "Only active bookings can be completed.",
            );
          }
          await transitionBooking(client, row.id, row.status, "COMPLETED", "CHEF", user.id, note);

          const earning = await client.query<{
            id: string;
            chef_payout_cents: number;
            status: "PENDING" | "PAYABLE" | "PAID" | "CANCELLED";
            payout_reference: string | null;
            created_at: Date;
          }>(
            `INSERT INTO app.chef_earnings
             (booking_id, chef_user_id, gross_cents, chef_payout_cents, platform_revenue_cents)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (booking_id) DO UPDATE SET updated_at = app.chef_earnings.updated_at
           RETURNING id::text, chef_payout_cents, status, payout_reference, created_at`,
            [row.id, user.id, row.total_cents, row.chef_payable_cents, row.platform_revenue_cents],
          );
          let surveysIssued = 0;
          const customerEmail = typeof row.contact?.email === "string" ? row.contact.email : null;
          if (customerEmail) {
            await upsertCommunication(client, {
              channel: "EMAIL",
              recipient: customerEmail,
              subject: `How was your ChefMate booking ${row.reference}?`,
              templateKey: "customer.survey.invite",
              bodyPreview: "Tell us how your ChefMate session went. Survey link redacted.",
              deliveryBodyPreview: "Tell us how your ChefMate session went.",
              relatedBookingId: row.id,
              relatedUserId: null,
              metadata: { linkRedacted: true, reference: row.reference },
              deliveryMetadata: {
                reference: row.reference,
                deliveryLink: {
                  kind: "customerSurvey",
                  webAppBaseUrl: options.webAppBaseUrl,
                  bookingId: row.id,
                  customerEmail,
                },
              },
              correlationId: request.id,
            });
            surveysIssued = 1;
          }
          await audit(client, user.id, "chef.booking_completed", "booking", row.id);
          const earningRow = earning.rows[0];
          if (!earningRow) throw new Error("Earning insert failed.");
          return {
            surveysIssued,
            earning: {
              id: earningRow.id,
              bookingRequestId: row.id,
              bookingReference: row.reference,
              chefUserId: user.id,
              chefDisplayName: user.displayName,
              chefPayoutCents: earningRow.chef_payout_cents,
              status: earningRow.status,
              payoutReference: earningRow.payout_reference,
              createdAt: earningRow.created_at.toISOString(),
            },
          };
        });
        return reply.status(200).send(
          dataEnvelope(request, {
            booking: await bookingDto(pool, request.params.bookingId, user.id),
            surveysIssued: result.surveysIssued,
            earning: result.earning,
          }),
        );
      } catch (error) {
        return fail(request, reply, error);
      }
    },
  );

  app.get("/api/v1/chef/notifications", async (request, reply) => {
    try {
      const user = await requireRole(request, pool, ["CHEF"]);
      const result = await pool.query(
        `SELECT id::text, kind, title, body, data, read_at, created_at
           FROM app.notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
        [user.id],
      );
      return reply.status(200).send(dataEnvelope(request, { items: result.rows }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/operations/dashboard", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const { from, toExclusive } = resolveDashboardRange(request.query as Record<string, unknown>);
      const topChefsLimit = parseTopChefsLimit(request.query as Record<string, unknown>);

      const [customers, chefs, applications, bookings, comms, magicLinks, chefJoins, topChefs] =
        await Promise.all([
          pool.query<{ count: string }>(
            "SELECT count(*)::text FROM app.user_roles WHERE role = 'CUSTOMER'",
          ),
          pool.query<{ count: string }>(
            "SELECT count(*)::text FROM app.user_roles WHERE role = 'CHEF'",
          ),
          pool.query<{ status: string; count: string }>(
            `SELECT status, count(*)::text
             FROM app.chef_applications
            WHERE applied_at >= $1 AND applied_at < $2
            GROUP BY status`,
            [from, toExclusive],
          ),
          pool.query<{
            count: string;
            collected: string;
            chef_payable: string;
            platform_revenue: string;
          }>(
            `SELECT count(*)::text,
                  COALESCE(sum(total_cents), 0)::text AS collected,
                  COALESCE(sum(chef_payable_cents), 0)::text AS chef_payable,
                  COALESCE(sum(platform_revenue_cents), 0)::text AS platform_revenue
             FROM app.bookings
            WHERE created_at >= $1 AND created_at < $2`,
            [from, toExclusive],
          ),
          pool.query<{ status: string; count: string }>(
            `SELECT status, count(*)::text
             FROM app.communication_logs
            WHERE created_at >= $1 AND created_at < $2
            GROUP BY status`,
            [from, toExclusive],
          ),
          pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count
             FROM app.communication_logs
            WHERE template_key = 'chef.portal.invite'
              AND created_at >= $1 AND created_at < $2`,
            [from, toExclusive],
          ),
          pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count
             FROM app.magic_tokens
            WHERE purpose = 'CHEF_PORTAL_INVITE'
              AND consumed_at IS NOT NULL
              AND consumed_at >= $1 AND consumed_at < $2`,
            [from, toExclusive],
          ),
          pool.query<{
            user_id: string;
            display_name: string;
            email: string;
            completed_jobs: string;
            completed_revenue: string;
            payable_revenue: string;
          }>(
            `SELECT u.id::text AS user_id,
                  u.display_name,
                  u.email,
                  COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED')::text AS completed_jobs,
                  COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_cents ELSE 0 END), 0)::text AS completed_revenue,
                  COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.chef_payable_cents ELSE 0 END), 0)::text AS payable_revenue
             FROM app.users u
             JOIN app.user_roles r ON r.user_id = u.id AND r.role = 'CHEF'
             LEFT JOIN app.booking_assignments ba ON ba.chef_user_id = u.id
             LEFT JOIN app.bookings b ON b.id = ba.booking_id AND b.created_at >= $1 AND b.created_at < $2
            GROUP BY u.id, u.display_name, u.email
            HAVING COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED') > 0
            ORDER BY COUNT(b.id) FILTER (WHERE b.status = 'COMPLETED') DESC,
                     COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_cents ELSE 0 END), 0) DESC
            LIMIT $3`,
            [from, toExclusive, topChefsLimit],
          ),
        ]);

      const appCounts = Object.fromEntries(
        applications.rows.map((row) => [row.status, Number(row.count)]),
      );
      const commCounts = Object.fromEntries(
        comms.rows.map((row) => [row.status, Number(row.count)]),
      );
      const booking = bookings.rows[0];

      return reply.status(200).send(
        dataEnvelope(request, {
          customersCount: Number(customers.rows[0]?.count ?? 0),
          chefsCount: Number(chefs.rows[0]?.count ?? 0),
          chefApplicationsCount: applications.rows.reduce((sum, row) => sum + Number(row.count), 0),
          chefApplicationStatusCounts: appCounts,
          bookingsThisMonthCount: Number(booking?.count ?? 0),
          collectedThisMonthCents: Number(booking?.collected ?? 0),
          chefPayableCents: Number(booking?.chef_payable ?? 0),
          platformRevenueCents: Number(booking?.platform_revenue ?? 0),
          communicationsQueuedCount: commCounts.QUEUED ?? 0,
          communicationsSentCount: commCounts.SENT ?? 0,
          magicLinksSentCount: Number(magicLinks.rows[0]?.count ?? 0),
          chefsSuccessfullyJoinedCount: Number(chefJoins.rows[0]?.count ?? 0),
          topChefs: topChefsRowsToDto(topChefs.rows),
          whatsAppReady: false,
          dateRange: {
            from: from.toISOString(),
            to: toExclusive.toISOString(),
          },
        }),
      );
    } catch (error) {
      return fail(request, reply, error);
    }
  });
  app.get("/api/v1/operations/chef-applications", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const result = await pool.query<{ id: string }>(
        "SELECT id::text FROM app.chef_applications ORDER BY applied_at DESC",
      );
      const items = await Promise.all(result.rows.map((row) => applicationDto(pool, row.id)));
      return reply.status(200).send(dataEnvelope(request, { items }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.patch<{ Params: { applicationId: string } }>(
    "/api/v1/operations/chef-applications/:applicationId",
    async (request, reply) => {
      try {
        const actor = await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
        const body = recordBody(request.body);
        const status = parseApplicationStatus(body.status);
        const interviewScheduledAt = nullableStringField(body, "interviewScheduledAt");
        const interviewConducted = optionalBoolean(body, "interviewConducted");
        const adminNotes = nullableStringField(body, "adminNotes");
        const updated = await withTransaction(pool, async (client) => {
          const current = await client.query<{ id: string }>(
            "SELECT id::text FROM app.chef_applications WHERE id = $1 FOR UPDATE",
            [request.params.applicationId],
          );
          if (!current.rows[0]) {
            throw new HttpRouteError(404, "NOT_FOUND", "Chef application not found.");
          }
          const sets: string[] = ["updated_at = now()"];
          const values: unknown[] = [];
          const add = (sql: string, value: unknown) => {
            values.push(value);
            sets.push(`${sql} = $${values.length}`);
          };
          if (status) add("status", status);
          if (interviewScheduledAt !== null) {
            add("interview_scheduled_at", interviewScheduledAt);
            if (!status) add("status", "INTERVIEW_SCHEDULED");
          }
          if (interviewConducted) {
            sets.push("interview_conducted_at = COALESCE(interview_conducted_at, now())");
            if (!status) add("status", "INTERVIEW_CONDUCTED");
          }
          if (body.adminNotes !== undefined) add("admin_notes", adminNotes);
          values.push(request.params.applicationId);
          await client.query(
            `UPDATE app.chef_applications SET ${sets.join(", ")} WHERE id = $${values.length}`,
            values,
          );
          await audit(
            client,
            actor.id,
            "chef_application.updated",
            "chef_application",
            request.params.applicationId,
          );
          return applicationDto(client, request.params.applicationId);
        });
        return reply.status(200).send(dataEnvelope(request, updated));
      } catch (error) {
        return fail(request, reply, error);
      }
    },
  );

  app.post<{ Params: { applicationId: string } }>(
    "/api/v1/operations/chef-applications/:applicationId/invite",
    async (request, reply) => {
      try {
        const actor = await requireRole(request, pool, ["ADMIN"]);
        const result = await withTransaction(pool, async (client) => {
          const application = await client.query<{
            id: string;
            full_name: string;
            email: string;
            phone: string;
            service_areas: string[];
            status: ApplicationStatus;
          }>("SELECT * FROM app.chef_applications WHERE id = $1 FOR UPDATE", [
            request.params.applicationId,
          ]);
          const row = application.rows[0];
          if (!row) throw new HttpRouteError(404, "NOT_FOUND", "Chef application not found.");
          if (row.status !== "APPROVED") {
            throw new HttpRouteError(
              409,
              "APPLICATION_NOT_APPROVED",
              "Chef application must be approved before portal access can be sent.",
            );
          }
          let userId: string;
          const existing = await client.query<{ id: string }>(
            "SELECT id::text FROM app.users WHERE email = $1",
            [row.email],
          );
          if (existing.rows[0]) {
            userId = existing.rows[0].id;
            await client.query(
              "UPDATE app.users SET display_name = $1, updated_at = now() WHERE id = $2",
              [row.full_name, userId],
            );
          } else {
            const inserted = await client.query<{ id: string }>(
              `INSERT INTO app.users (email, display_name, email_verified_at)
               VALUES ($1, $2, now())
               RETURNING id::text`,
              [row.email, row.full_name],
            );
            userId = inserted.rows[0]?.id ?? "";
          }
          if (!userId) throw new Error("Chef user upsert failed.");
          await client.query(
            `INSERT INTO app.user_roles (user_id, role)
             VALUES ($1, 'CHEF')
             ON CONFLICT DO NOTHING`,
            [userId],
          );
          await client.query(
            `INSERT INTO app.chef_profiles (user_id, service_area, service_areas)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
               service_area = COALESCE(app.chef_profiles.service_area, EXCLUDED.service_area),
               service_areas = CASE
                 WHEN app.chef_profiles.service_areas = '{}' THEN EXCLUDED.service_areas
                 ELSE app.chef_profiles.service_areas
               END,
               updated_at = now()`,
            [userId, row.service_areas[0] ?? null, row.service_areas],
          );
          await client.query(
            `UPDATE app.chef_applications
                SET status = 'INVITED', invited_user_id = $1, invited_at = now(), updated_at = now()
              WHERE id = $2`,
            [userId, row.id],
          );
          await upsertCommunication(client, {
            channel: "EMAIL",
            recipient: row.email,
            subject: "Your ChefMate chef portal is ready",
            templateKey: "chef.portal.invite",
            bodyPreview: "Open your secure ChefMate chef portal link. Token redacted.",
            deliveryBodyPreview: "Open your secure ChefMate chef portal link.",
            relatedUserId: userId,
            metadata: { applicationId: row.id, linkRedacted: true },
            deliveryMetadata: {
              applicationId: row.id,
              deliveryLink: {
                kind: "chefPortalInvite",
                webAppBaseUrl: options.webAppBaseUrl,
                userId,
                chefApplicationId: row.id,
              },
            },
            correlationId: request.id,
          });
          await audit(client, actor.id, "chef_application.invited", "chef_application", row.id, {
            userId,
          });
          return { application: await applicationDto(client, row.id), deliveryStatus: "QUEUED" };
        });
        return reply.status(200).send(dataEnvelope(request, result));
      } catch (error) {
        return fail(request, reply, error);
      }
    },
  );

  app.get("/api/v1/operations/customers", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const result = await pool.query<{ id: string }>(
        `SELECT u.id::text
           FROM app.users u
           JOIN app.user_roles r ON r.user_id = u.id AND r.role = 'CUSTOMER'
          ORDER BY u.created_at DESC`,
      );
      const items = (
        await Promise.all(result.rows.map((row) => fetchUserById(pool, row.id)))
      ).filter((user): user is AuthenticatedUser => user !== null);
      return reply.status(200).send(dataEnvelope(request, { items }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/operations/chefs", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const result = await pool.query<{ id: string }>(
        `SELECT u.id::text
           FROM app.users u
           JOIN app.user_roles r ON r.user_id = u.id AND r.role = 'CHEF'
          ORDER BY u.created_at DESC`,
      );
      const items = await Promise.all(
        result.rows.map(async (row) => {
          const user = await fetchUserById(pool, row.id);
          if (!user) return null;
          const profile = await chefProfileDto(pool, row.id, kms);
          return {
            ...user,
            profile: { ...profile, bankAccount: undefined },
            bankAccount: profile.bankAccount,
          };
        }),
      );
      return reply.status(200).send(dataEnvelope(request, { items: items.filter(Boolean) }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/operations/communications", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const limit = Math.min(
        100,
        Math.max(1, Number((request.query as { limit?: string }).limit ?? 50)),
      );
      const result = await pool.query<{
        id: string;
        channel: "EMAIL" | "WHATSAPP";
        status: "QUEUED" | "SENT" | "SKIPPED" | "FAILED";
        recipient: string;
        subject: string | null;
        template_key: string;
        body_preview: string | null;
        provider: string | null;
        related_booking_id: string | null;
        related_user_id: string | null;
        metadata: Record<string, unknown> | null;
        sent_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id::text, channel, status, recipient, subject, template_key, body_preview,
                provider, related_booking_id::text, related_user_id::text, metadata, sent_at, created_at
           FROM app.communication_logs
          ORDER BY created_at DESC
          LIMIT $1`,
        [limit],
      );
      return reply.status(200).send(
        dataEnvelope(request, {
          items: result.rows.map((row) => ({
            id: row.id,
            channel: row.channel,
            status: row.status,
            recipient: row.recipient,
            subject: row.subject,
            templateKey: row.template_key,
            bodyPreview: row.body_preview,
            provider: row.provider,
            relatedBookingRequestId: row.related_booking_id,
            relatedUserId: row.related_user_id,
            metadata: row.metadata,
            sentAt: iso(row.sent_at),
            createdAt: row.created_at.toISOString(),
          })),
          nextCursor: null,
        }),
      );
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post("/api/v1/operations/communications/whatsapp-preview", async (request, reply) => {
    try {
      const actor = await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const body = recordBody(request.body);
      const recipient = stringField(body, "recipient", { min: 5, max: 50 });
      const templateKey = stringField(body, "templateKey", { min: 2, max: 120 });
      const bodyPreview = stringField(body, "bodyPreview", { min: 2, max: 500 });
      const logId = await withTransaction(pool, async (client) => {
        const id = await upsertCommunication(client, {
          channel: "WHATSAPP",
          recipient,
          templateKey,
          bodyPreview,
          relatedBookingId: nullableStringField(body, "relatedBookingRequestId"),
          relatedUserId: nullableStringField(body, "relatedUserId"),
          metadata: { previewOnly: true },
          provider: "meta-disabled",
          queue: false,
          correlationId: request.id,
        });
        await audit(client, actor.id, "communication.whatsapp_preview_logged", "communication", id);
        return id;
      });
      const logs = await pool.query("SELECT * FROM app.communication_logs WHERE id = $1", [logId]);
      return reply.status(201).send(
        dataEnvelope(request, {
          id: logId,
          channel: "WHATSAPP",
          status: "SKIPPED",
          recipient,
          subject: null,
          templateKey,
          bodyPreview,
          provider: "meta-disabled",
          relatedBookingRequestId:
            (logs.rows[0] as { related_booking_id?: string | null }).related_booking_id ?? null,
          relatedUserId:
            (logs.rows[0] as { related_user_id?: string | null }).related_user_id ?? null,
          metadata: { previewOnly: true },
          sentAt: null,
          createdAt:
            iso((logs.rows[0] as { created_at?: Date }).created_at) ?? new Date().toISOString(),
        }),
      );
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/operations/analytics/popular-meals", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const limit = Math.min(
        25,
        Math.max(1, Number((request.query as { limit?: string }).limit ?? 10)),
      );
      const result = await pool.query<{
        slug: string;
        name: string;
        kind: string;
        order_count: string;
        gross_cents: string;
      }>(
        `SELECT i.slug, i.name, i.kind, count(*)::text AS order_count,
                COALESCE(sum(b.total_cents), 0)::text AS gross_cents
           FROM app.booking_items i
           JOIN app.bookings b ON b.id = i.booking_id
          WHERE b.status IN ('REQUESTED', 'CHEF_MATCHED', 'EN_ROUTE', 'COMPLETED')
            AND i.kind = 'main'
          GROUP BY i.slug, i.name, i.kind
          ORDER BY count(*) DESC, i.name ASC
          LIMIT $1`,
        [limit],
      );
      return reply.status(200).send(
        dataEnvelope(request, {
          items: result.rows.map((row) => ({
            slug: row.slug,
            name: row.name,
            kind: row.kind,
            orderCount: Number(row.order_count),
            grossCents: Number(row.gross_cents),
          })),
        }),
      );
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/operations/bookings", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const result = await pool.query(
        `SELECT b.id::text, b.reference, b.status, b.scheduled_date, b.time_slot,
                b.total_cents, b.chef_payable_cents, b.platform_revenue_cents,
                b.contact, b.address, u.display_name AS chef_name
           FROM app.bookings b
           LEFT JOIN app.booking_assignments a ON a.booking_id = b.id
           LEFT JOIN app.users u ON u.id = a.chef_user_id
          ORDER BY b.created_at DESC
          LIMIT 200`,
      );
      return reply.status(200).send(dataEnvelope(request, { items: result.rows }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get("/api/v1/operations/payouts", async (request, reply) => {
    try {
      await requireRole(request, pool, ["ADMIN", "SUPPORT"]);
      const result = await pool.query(
        `SELECT p.id::text, p.chef_user_id::text, u.display_name AS chef_name, p.status,
                p.total_cents, p.earning_ids, p.provider, p.provider_reference, p.created_at
           FROM app.payouts p
           JOIN app.users u ON u.id = p.chef_user_id
          ORDER BY p.created_at DESC
          LIMIT 200`,
      );
      return reply.status(200).send(dataEnvelope(request, { items: result.rows }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get<{ Params: { token: string } }>("/api/v1/surveys/:token", async (request, reply) => {
    try {
      const tokenHash = hashToken(request.params.token);
      await Promise.all([
        checkRateLimit(
          pool,
          requestRateLimitKey(request, "survey:get:ip"),
          SURVEY_TOKEN_RATE_LIMIT,
        ),
        checkRateLimit(
          pool,
          requestRateLimitKey(request, "survey:get:token", tokenHash),
          SURVEY_TOKEN_RATE_LIMIT,
        ),
      ]);
      const result = await pool.query<{
        id: string;
        status: "PENDING" | "SUBMITTED" | "EXPIRED";
        expires_at: Date;
        reference: string;
      }>(
        `SELECT s.id::text, s.status, s.expires_at, b.reference
           FROM app.survey_tokens s
           JOIN app.bookings b ON b.id = s.booking_id
          WHERE s.token_hash = $1`,
        [tokenHash],
      );
      const row = result.rows[0];
      if (!row || row.expires_at.getTime() <= Date.now()) {
        throw new HttpRouteError(404, "NOT_FOUND", "Survey link unavailable.");
      }
      return reply.status(200).send(
        dataEnvelope(request, {
          id: row.id,
          status: row.status === "SUBMITTED" ? "COMPLETED" : row.status,
          bookingReference: row.reference,
          recipientRole: "CUSTOMER",
          expiresAt: row.expires_at.toISOString(),
          questions: ["mealRating", "sessionRating", "comment"],
          ratingQuestions: [
            "How was the food?",
            "How was your chef?",
            "Would you book ChefMate again?",
          ],
        }),
      );
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post<{ Params: { token: string } }>("/api/v1/surveys/:token", async (request, reply) => {
    try {
      const tokenHash = hashToken(request.params.token);
      await Promise.all([
        checkRateLimit(
          pool,
          requestRateLimitKey(request, "survey:submit:ip"),
          SURVEY_TOKEN_RATE_LIMIT,
        ),
        checkRateLimit(
          pool,
          requestRateLimitKey(request, "survey:submit:token", tokenHash),
          SURVEY_TOKEN_RATE_LIMIT,
        ),
      ]);
      const body = recordBody(request.body);
      const ratingValues = Object.entries(body)
        .filter(
          ([key, value]) => key !== "comment" && key !== "answers" && typeof value === "number",
        )
        .map(([, value]) => value as number);
      const rating =
        ratingValues.length > 0
          ? Math.round(ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length)
          : null;
      if (rating === null || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new HttpRouteError(
          400,
          "VALIDATION_FAILED",
          "rating must be an integer from 1 to 5.",
        );
      }
      const answers = { ...body };
      const result = await pool.query<{ id: string }>(
        `UPDATE app.survey_tokens
            SET status = 'SUBMITTED', rating = $1, answers = $2::jsonb, submitted_at = now()
          WHERE token_hash = $3 AND status = 'PENDING' AND expires_at > now()
          RETURNING id::text`,
        [rating, JSON.stringify(answers), tokenHash],
      );
      if (!result.rows[0]) throw new HttpRouteError(404, "NOT_FOUND", "Survey link unavailable.");
      return reply.status(200).send(dataEnvelope(request, { status: "SUBMITTED" }));
    } catch (error) {
      return fail(request, reply, error);
    }
  });
}

export { createChefOffersForBooking };
