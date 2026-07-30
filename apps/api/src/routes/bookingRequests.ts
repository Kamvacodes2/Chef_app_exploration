import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool, PoolClient } from "pg";
import { withTransaction } from "@chefmate/database";
import { calculatePricingQuote, type PricingItem, type PricingPayload } from "@chefmate/domain";

const BANK_TRANSFER_INSTRUCTIONS = {
  bankName: "Chefmate Test Bank",
  branchName: "Test Branch",
  branchCode: "000000",
  accountHolder: "Chefmate Test Account",
  accountNumber: "0000000000",
  accountType: "Cheque",
} as const;

interface BookingPayload extends PricingPayload {
  readonly source: "landing-order-flow";
  readonly goalId: string | null;
  readonly scheduledDate: string;
  readonly timeSlot: string;
  readonly address: unknown;
  readonly contact?: unknown;
}

interface BookingRow {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly subtotal_cents: number;
  readonly discount_cents: number;
  readonly total_cents: number;
  readonly payment_method: string | null;
  readonly payment_status: string | null;
  readonly bank_transfer: Record<string, unknown> | null;
}

function meta(request: FastifyRequest) {
  return { requestId: request.id, correlationId: request.id };
}

function problem(request: FastifyRequest, status: number, message: string) {
  return {
    code: status === 400 ? "VALIDATION_FAILED" : "REQUEST_FAILED",
    message,
    status,
    retryable: false,
    meta: meta(request),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${key} is required.`);
  return value.trim();
}

function nullableStringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${key} must be a string or null.`);
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function stringArrayField(body: Record<string, unknown>, key: string): readonly string[] {
  const value = body[key];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`${key} must be an array of strings.`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function parsePricingPayload(body: unknown): PricingPayload {
  if (!isRecord(body)) throw new Error("JSON body is required.");
  const planSelection = isRecord(body.planSelection)
    ? {
        planId: stringField(body.planSelection, "planId"),
        preferredDays: Array.isArray(body.planSelection.preferredDays)
          ? body.planSelection.preferredDays.filter(
              (entry): entry is string => typeof entry === "string",
            )
          : [],
        schedulePreference:
          nullableStringField(body.planSelection, "schedulePreference") ?? undefined,
        favoriteMealSlug: nullableStringField(body.planSelection, "favoriteMealSlug"),
      }
    : undefined;

  return {
    mainSlug: stringField(body, "mainSlug"),
    sideSlugs: stringArrayField(body, "sideSlugs"),
    dessertSlug: nullableStringField(body, "dessertSlug"),
    customRequest: nullableStringField(body, "customRequest"),
    giftCode: nullableStringField(body, "giftCode"),
    ...(planSelection ? { planSelection } : {}),
  };
}

function parseBookingPayload(body: unknown): BookingPayload {
  if (!isRecord(body)) throw new Error("JSON body is required.");
  const pricing = parsePricingPayload(body);
  const source = stringField(body, "source");
  if (source !== "landing-order-flow") throw new Error("source is invalid.");
  const scheduledDate = stringField(body, "scheduledDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) throw new Error("scheduledDate is invalid.");
  const timeSlot = stringField(body, "timeSlot");
  if (!/^\d{2}:\d{2}$/.test(timeSlot)) throw new Error("timeSlot is invalid.");
  const address = body.address;
  if (!isRecord(address)) throw new Error("address is required.");

  return {
    ...pricing,
    source,
    goalId: nullableStringField(body, "goalId"),
    scheduledDate,
    timeSlot,
    address,
    ...(body.contact !== undefined ? { contact: body.contact } : {}),
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function splitChefShare(amountCents: number): number {
  return Math.round((amountCents * 6_500) / 10_000);
}

async function findBookingByIdempotencyKey(
  client: Pick<Pool | PoolClient, "query">,
  idempotencyKey: string,
): Promise<BookingRow | null> {
  const result = await client.query<BookingRow>(
    `SELECT b.id::text, b.reference, b.status, b.subtotal_cents, b.discount_cents, b.total_cents,
            p.method AS payment_method, p.status AS payment_status, p.bank_transfer
       FROM app.bookings b
       LEFT JOIN app.booking_payments p ON p.booking_id = b.id
      WHERE b.idempotency_key = $1`,
    [idempotencyKey],
  );
  return result.rows[0] ?? null;
}

function toBookingResponse(row: BookingRow) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    payment: row.payment_method
      ? {
          method: row.payment_method,
          status: row.payment_status,
          bankTransfer: row.bank_transfer,
        }
      : null,
  };
}

async function nextReference(client: PoolClient, scheduledDate: string): Promise<string> {
  const result = await client.query<{ value: string }>(
    "SELECT nextval('app.booking_reference_seq')::text AS value",
  );
  const sequence = Number(result.rows[0]?.value ?? 0);
  const year = scheduledDate.slice(0, 4);
  return `CM-${year}-${String(sequence).padStart(6, "0")}`;
}

async function insertItems(
  client: PoolClient,
  bookingId: string,
  items: readonly PricingItem[],
): Promise<void> {
  for (const item of items) {
    const chefPayableCents = splitChefShare(item.priceCents);
    await client.query(
      `INSERT INTO app.booking_items
         (booking_id, kind, slug, name, price_cents, chef_payable_cents, platform_revenue_cents, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        bookingId,
        item.kind,
        item.slug,
        item.name,
        item.priceCents,
        chefPayableCents,
        item.priceCents - chefPayableCents,
        item.sortOrder,
      ],
    );
  }
}

export async function registerBookingRequestRoutes(
  app: FastifyInstance,
  pool: Pool,
): Promise<void> {
  app.post("/api/v1/booking-requests/quote", async (request, reply) => {
    try {
      const payload = parsePricingPayload(request.body);
      const quote = calculatePricingQuote(payload);
      const {
        status: _status,
        chefPayableCents: _chef,
        platformRevenueCents: _platform,
        ...data
      } = quote;
      return reply.status(200).send({ data, meta: meta(request) });
    } catch (error) {
      return reply.status(400).send(problem(request, 400, (error as Error).message));
    }
  });

  app.post("/api/v1/booking-requests", async (request, reply) => {
    const idempotencyHeader = request.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(idempotencyHeader)
      ? idempotencyHeader[0]
      : idempotencyHeader;
    if (!idempotencyKey || idempotencyKey.trim() === "") {
      return reply.status(400).send(problem(request, 400, "Idempotency-Key header is required."));
    }

    let payload: BookingPayload;
    try {
      payload = parseBookingPayload(request.body);
    } catch (error) {
      return reply.status(400).send(problem(request, 400, (error as Error).message));
    }

    const existing = await findBookingByIdempotencyKey(pool, idempotencyKey);
    if (existing)
      return reply.status(200).send({ data: toBookingResponse(existing), meta: meta(request) });

    try {
      const row = await withTransaction(pool, async (client) => {
        const quote = calculatePricingQuote(payload);
        const reference = await nextReference(client, payload.scheduledDate);
        const insert = await client.query<{ id: string }>(
          `INSERT INTO app.bookings
             (reference, status, source, goal_id, main_slug, side_slugs, dessert_slug,
              custom_request, scheduled_date, time_slot, address, contact, gift_code,
              plan_id, plan_selection, subtotal_cents, discount_cents, total_cents,
              chef_payable_cents, platform_revenue_cents, idempotency_key, request_fingerprint)
           VALUES
             ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13,
              $14, $15::jsonb, $16, $17, $18, $19, $20, $21, $22)
           RETURNING id::text`,
          [
            reference,
            quote.status,
            payload.source,
            payload.goalId,
            payload.mainSlug,
            payload.sideSlugs,
            payload.dessertSlug,
            payload.customRequest,
            payload.scheduledDate,
            payload.timeSlot,
            JSON.stringify(payload.address),
            payload.contact === undefined ? null : JSON.stringify(payload.contact),
            payload.giftCode,
            quote.plan?.id ?? null,
            payload.planSelection === undefined ? null : JSON.stringify(payload.planSelection),
            quote.subtotalCents,
            quote.discountCents,
            quote.totalCents,
            quote.chefPayableCents,
            quote.platformRevenueCents,
            idempotencyKey,
            fingerprint(payload),
          ],
        );
        const bookingId = insert.rows[0]?.id;
        if (!bookingId) throw new Error("Booking insert failed.");

        await insertItems(client, bookingId, quote.items);

        if (quote.status === "REQUESTED") {
          const bankTransfer = { ...BANK_TRANSFER_INSTRUCTIONS, paymentReference: reference };
          await client.query(
            `INSERT INTO app.booking_payments (booking_id, method, status, bank_transfer)
             VALUES ($1, 'BANK_TRANSFER', 'PENDING', $2::jsonb)`,
            [bookingId, JSON.stringify(bankTransfer)],
          );
        }

        await client.query(
          `INSERT INTO app.outbox_events (topic, aggregate_type, aggregate_id, payload)
           VALUES ($1, 'booking', $2, $3::jsonb)`,
          [
            quote.status === "NEEDS_REVIEW" ? "booking.review_requested" : "booking.requested",
            bookingId,
            JSON.stringify({ reference, status: quote.status }),
          ],
        );

        const created = await findBookingByIdempotencyKey(client, idempotencyKey);
        if (!created) throw new Error("Booking lookup failed.");
        return created;
      });

      return reply.status(201).send({ data: toBookingResponse(row), meta: meta(request) });
    } catch (error) {
      request.log.error({ err: error }, "booking request failed");
      return reply.status(500).send({
        code: "INTERNAL_ERROR",
        message: "Booking request could not be created.",
        status: 500,
        retryable: true,
        meta: meta(request),
      });
    }
  });
}
