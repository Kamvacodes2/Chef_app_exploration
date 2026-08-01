import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { buildApp } from "../../apps/api/src/app.js";
import { SESSION_COOKIE_NAME, hashToken } from "../../apps/api/src/auth/session.js";
import { emailHandler } from "../../apps/worker/src/outbox/handlers.js";
import type { OutboxEvent } from "../../apps/worker/src/outbox/types.js";
import { createPool, migrate } from "../../packages/database/src/index.js";
import { LocalDevKmsProvider } from "../../packages/integrations/src/index.js";
import { createLogger } from "../../packages/observability/src/index.js";
import {
  provisionDisposablePostgres,
  type DisposablePostgres,
} from "../../packages/testkit/src/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = path.join(repoRoot, "packages", "database", "migrations");

let database: DisposablePostgres;
let pool: Pool;
let app: Awaited<ReturnType<typeof buildApp>>;
let baseUrl: string;

const LINK_TOKEN_SECRET = "integration-test-link-token-secret";

function silentLogger() {
  return createLogger({ name: "platform-ops-test-api", level: "silent" });
}

async function json(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

function cookie(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("expected Set-Cookie header");
  return value.split(";")[0] ?? value;
}

beforeAll(async () => {
  database = await provisionDisposablePostgres();
  await migrate({ connectionString: database.connectionString, migrationsDir: MIGRATIONS_DIR });

  pool = createPool({
    connectionString: database.connectionString,
    applicationName: "platform-ops-test",
  });
  app = await buildApp({
    logger: silentLogger(),
    pool,
    kms: new LocalDevKmsProvider("CHANGE_ME_LOCAL_ONLY_PLATFORM_OPS_TEST_KEY"),
    webAppBaseUrl: "http://web.test",
  });
  await app.listen({ host: "127.0.0.1", port: 0 });

  const address = app.server.address();
  if (address === null || typeof address === "string")
    throw new Error("API did not bind a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 240_000);

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await database?.stop();
});

async function registerCustomer(
  email: string,
  displayName: string,
): Promise<{
  readonly userId: string;
  readonly cookie: string;
}> {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName,
      email,
      password: "StrongPass12345",
    }),
  });
  expect(response.status).toBe(201);
  const body = (await json(response)) as { data: { user: { id: string; roles: string[] } } };
  expect(body.data.user.roles).toContain("CUSTOMER");
  return { userId: body.data.user.id, cookie: cookie(response) };
}

async function grantRole(userId: string, role: string): Promise<void> {
  await pool.query(
    `INSERT INTO app.user_roles (user_id, role)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, role],
  );
}
async function sendQueuedEmail(templateKey: string): Promise<{ readonly text: string }> {
  const result = await pool.query<{
    id: string;
    event_type: string;
    payload: unknown;
    correlation_id: string;
    attempts: number;
    available_at: Date;
  }>(
    `SELECT id::text, event_type, payload, correlation_id, attempts, available_at
       FROM app.outbox_events
      WHERE status = 'PENDING'
        AND event_type = 'communication.email.transactional.v1'
        AND payload->>'templateKey' = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [templateKey],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`No queued email event for ${templateKey}`);

  const sent: Array<{ readonly text: string }> = [];
  await emailHandler({
    pool,
    logger: silentLogger(),
    linkTokenSecret: LINK_TOKEN_SECRET,
    mail: {
      name: "test-mail",
      sendTransactional: async (input) => {
        sent.push({ text: input.text });
        return { provider: "test-mail", reference: input.idempotencyKey };
      },
      verifyWebhookSignature: () => true,
    },
  })({
    id: row.id,
    eventType: row.event_type,
    payload: row.payload,
    correlationId: row.correlation_id,
    attempts: row.attempts,
    availableAt: row.available_at,
  } satisfies OutboxEvent);
  await pool.query(
    `UPDATE app.outbox_events
        SET status = 'SENT',
            processed_at = now(),
            sent_at = now(),
            payload = jsonb_build_object('redacted', true, 'eventType', event_type)
      WHERE id = $1`,
    [row.id],
  );
  const email = sent[0];
  if (!email) throw new Error(`Email provider was not called for ${templateKey}`);
  return email;
}

function tokenFromFragmentLink(text: string): string {
  const url = text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error("Expected tokenized URL in email body");
  const token = new URLSearchParams(new URL(url).hash.replace(/^#/, "")).get("token");
  if (!token) throw new Error("Expected token fragment in email body");
  return token;
}

function tokenFromPathLink(text: string): string {
  const url = text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error("Expected tokenized URL in email body");
  const token = new URL(url).pathname.split("/").pop();
  if (!token) throw new Error("Expected token path segment in email body");
  return token;
}

describe("platform operations backend", () => {
  it("connects the admin-to-chef-to-booking lifecycle end to end", async () => {
    const admin = await registerCustomer("owner@example.test", "Owner Admin");
    await grantRole(admin.userId, "ADMIN");

    const adminMe = await fetch(`${baseUrl}/api/v1/auth/me`, {
      credentials: "include",
      headers: { Cookie: admin.cookie },
    });
    expect(adminMe.status).toBe(200);
    expect(await json(adminMe)).toMatchObject({
      data: { user: { email: "owner@example.test", roles: expect.arrayContaining(["ADMIN"]) } },
    });

    const applicationResponse = await fetch(`${baseUrl}/api/v1/chef-applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Chef Lerato",
        email: "chef.lerato@example.test",
        phone: "+27821234567",
        city: "Johannesburg",
        serviceAreas: ["Fourways", "Sandton"],
        experience: "Ten years of private dining and family meal prep.",
      }),
    });
    expect(applicationResponse.status).toBe(201);
    const application = (await json(applicationResponse)) as { data: { id: string } };

    const invalidStatusResponse = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/${application.data.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        body: JSON.stringify({ status: "NOT_A_STATUS" }),
      },
    );
    expect(invalidStatusResponse.status).toBe(400);
    expect(await json(invalidStatusResponse)).toMatchObject({ code: "VALIDATION_FAILED" });

    const interviewResponse = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/${application.data.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        body: JSON.stringify({ interviewConducted: true }),
      },
    );
    expect(interviewResponse.status).toBe(200);
    expect(await json(interviewResponse)).toMatchObject({
      data: { status: "INTERVIEW_CONDUCTED", interviewConductedAt: expect.any(String) },
    });

    const earlyInviteResponse = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/${application.data.id}/invite`,
      {
        method: "POST",
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(earlyInviteResponse.status).toBe(409);
    expect(await json(earlyInviteResponse)).toMatchObject({ code: "APPLICATION_NOT_APPROVED" });

    const approvedResponse = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/${application.data.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        body: JSON.stringify({ status: "APPROVED" }),
      },
    );
    expect(approvedResponse.status).toBe(200);
    expect(await json(approvedResponse)).toMatchObject({ data: { status: "APPROVED" } });

    const inviteResponse = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/${application.data.id}/invite`,
      {
        method: "POST",
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(inviteResponse.status).toBe(200);
    const invite = (await json(inviteResponse)) as {
      data: { application: { id: string; status: string }; deliveryStatus: string };
    };
    expect(invite.data.application.status).toBe("INVITED");
    expect(invite.data.deliveryStatus).toBe("QUEUED");
    expect(JSON.stringify(invite)).not.toContain("magic-login");

    const inviteEmail = await sendQueuedEmail("chef.portal.invite");
    const token = tokenFromFragmentLink(inviteEmail.text);
    const magicResponse = await fetch(`${baseUrl}/api/v1/chef/magic-login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    expect(magicResponse.status).toBe(200);
    const chefCookie = cookie(magicResponse);
    const magicBody = (await json(magicResponse)) as {
      data: { user: { id: string; roles: string[] } };
    };
    expect(magicBody.data.user.roles).toContain("CHEF");
    expect(magicBody.data.user.roles).not.toContain("COOK");

    const profileResponse = await fetch(`${baseUrl}/api/v1/chef/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", Cookie: chefCookie },
      body: JSON.stringify({
        isAvailable: true,
        serviceArea: "Fourways",
        serviceAreas: ["Fourways", "Sandton"],
        bio: "Warm family food, cooked beautifully.",
        latitude: null,
        longitude: null,
        maxTravelKm: 20,
        availability: { notes: "Weekday evenings" },
      }),
    });
    expect(profileResponse.status).toBe(200);

    const bankResponse = await fetch(`${baseUrl}/api/v1/chef/bank-details`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", Cookie: chefCookie },
      body: JSON.stringify({
        accountHolder: "Lerato Chef",
        bankName: "Test Bank",
        branchCode: "250655",
        accountNumber: "1234567890",
        accountType: "Cheque",
      }),
    });
    expect(bankResponse.status).toBe(200);
    expect(await json(bankResponse)).toMatchObject({
      data: { bankName: "Test Bank", accountNumberLast4: "7890" },
    });
    const storedBank = await pool.query<{ account_number_ciphertext: Buffer }>(
      "SELECT account_number_ciphertext FROM private.chef_bank_accounts WHERE user_id = $1",
      [magicBody.data.user.id],
    );
    expect(storedBank.rows[0]?.account_number_ciphertext.toString("utf8")).not.toContain(
      "1234567890",
    );
    await expect(
      pool.query("SELECT * FROM app.get_chef_bank_account($1)", ["not-a-live-session-token"]),
    ).resolves.toMatchObject({ rows: [] });
    await expect(
      pool.query("SELECT * FROM app.upsert_chef_bank_account($1, $2, $3, $4, $5, $6, $7, $8)", [
        "not-a-live-session-token",
        Buffer.from("holder"),
        Buffer.from("bank"),
        Buffer.from("branch"),
        Buffer.from("account"),
        null,
        "0000",
        "test-key",
      ]),
    ).resolves.toMatchObject({ rows: [] });

    const bookingResponse = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "platform-booking-001" },
      body: JSON.stringify({
        source: "landing-order-flow",
        goalId: "just-good-food",
        mainSlug: "chicken-peri-peri",
        sideSlugs: ["side-coleslaw", "side-mielies", "side-creamed-spinach"],
        dessertSlug: "dessert-malva",
        customRequest: null,
        scheduledDate: "2026-08-15",
        timeSlot: "18:30",
        address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
        contact: { name: "Test Customer", email: "customer@example.test", phone: "+27821234567" },
        giftCode: null,
      }),
    });
    expect(bookingResponse.status).toBe(201);

    const offersResponse = await fetch(`${baseUrl}/api/v1/chef/offers`, {
      credentials: "include",
      headers: { Cookie: chefCookie },
    });
    expect(offersResponse.status).toBe(200);
    const offers = (await json(offersResponse)) as {
      data: {
        items: Array<{ id: string; chefPayoutCents: number; booking: Record<string, unknown> }>;
      };
    };
    expect(offers.data.items).toHaveLength(1);
    expect(offers.data.items[0]).toMatchObject({ chefPayoutCents: 43_735 });
    expect(JSON.stringify(offers.data.items[0])).not.toMatch(/platform|percentage|share/i);
    expect(offers.data.items[0]?.booking).not.toHaveProperty("street");

    const acceptResponse = await fetch(
      `${baseUrl}/api/v1/chef/offers/${encodeURIComponent(offers.data.items[0]?.id ?? "")}/accept`,
      {
        method: "POST",
        credentials: "include",
        headers: { Cookie: chefCookie },
      },
    );
    expect(acceptResponse.status).toBe(200);
    const accepted = (await json(acceptResponse)) as {
      data: { booking: { id: string; street: string }; offer: { status: string } };
    };
    expect(accepted.data.offer.status).toBe("ACCEPTED");
    expect(accepted.data.booking.street).toBe("12 Jacaranda Ave");
    expect(JSON.stringify(accepted.data.booking)).not.toMatch(
      /platformRevenue|shareBasis|percentage/i,
    );

    const repeatAcceptResponse = await fetch(
      `${baseUrl}/api/v1/chef/offers/${encodeURIComponent(offers.data.items[0]?.id ?? "")}/accept`,
      {
        method: "POST",
        credentials: "include",
        headers: { Cookie: chefCookie },
      },
    );
    expect(repeatAcceptResponse.status).toBe(409);

    const declineAcceptedResponse = await fetch(
      `${baseUrl}/api/v1/chef/offers/${encodeURIComponent(offers.data.items[0]?.id ?? "")}/decline`,
      {
        method: "POST",
        credentials: "include",
        headers: { Cookie: chefCookie },
      },
    );
    expect(declineAcceptedResponse.status).toBe(404);

    const enRouteResponse = await fetch(
      `${baseUrl}/api/v1/chef/bookings/${accepted.data.booking.id}/en-route`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: chefCookie },
        body: JSON.stringify({ note: "On the way." }),
      },
    );
    expect(enRouteResponse.status).toBe(200);

    const completeResponse = await fetch(
      `${baseUrl}/api/v1/chef/bookings/${accepted.data.booking.id}/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: chefCookie },
        body: JSON.stringify({ note: "Completed with happy guests." }),
      },
    );
    expect(completeResponse.status).toBe(200);
    const completed = (await json(completeResponse)) as {
      data: { earning: Record<string, unknown>; surveysIssued: number };
    };
    expect(completed.data.earning).toMatchObject({ chefPayoutCents: 43_735, status: "PENDING" });
    expect(JSON.stringify(completed.data.earning)).not.toMatch(/platform|percentage|share/i);
    expect(completed.data.surveysIssued).toBe(1);

    const repeatCompleteResponse = await fetch(
      `${baseUrl}/api/v1/chef/bookings/${accepted.data.booking.id}/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: chefCookie },
        body: JSON.stringify({ note: "Already done." }),
      },
    );
    expect(repeatCompleteResponse.status).toBe(409);

    const dashboardResponse = await fetch(`${baseUrl}/api/v1/operations/dashboard`, {
      credentials: "include",
      headers: { Cookie: admin.cookie },
    });
    expect(dashboardResponse.status).toBe(200);
    expect(await json(dashboardResponse)).toMatchObject({
      data: {
        customersCount: 1,
        chefsCount: 1,
        chefApplicationsCount: 1,
        bookingsThisMonthCount: 1,
        chefPayableCents: 43_735,
        platformRevenueCents: 23_550,
      },
    });

    const communicationsResponse = await fetch(
      `${baseUrl}/api/v1/operations/communications?limit=20`,
      {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(communicationsResponse.status).toBe(200);
    const communications = (await json(communicationsResponse)) as {
      data: {
        items: Array<{
          templateKey: string;
          channel: string;
          status: string;
          bodyPreview: string | null;
          metadata: Record<string, unknown> | null;
        }>;
      };
    };
    expect(communications).toMatchObject({
      data: {
        items: expect.arrayContaining([
          expect.objectContaining({
            channel: "EMAIL",
            status: "SENT",
            templateKey: "chef.portal.invite",
            bodyPreview: "Open your secure ChefMate chef portal link. Token redacted.",
            metadata: expect.objectContaining({ linkRedacted: true }),
          }),
          expect.objectContaining({
            channel: "EMAIL",
            status: "QUEUED",
            templateKey: "chef.booking.offer",
            bodyPreview: expect.stringMatching(/R\s*437,35/),
          }),
          expect.objectContaining({
            channel: "EMAIL",
            status: "QUEUED",
            templateKey: "customer.survey.invite",
            bodyPreview: "Tell us how your ChefMate session went. Survey link redacted.",
            metadata: expect.objectContaining({ linkRedacted: true }),
          }),
        ]),
      },
    });
    const serializedCommunications = JSON.stringify(communications);
    expect(serializedCommunications).not.toContain("/chef/magic-login");
    expect(serializedCommunications).not.toContain("token=");
    expect(serializedCommunications).not.toContain("/survey/");

    const queuedPayloads = await pool.query<{ payload: string }>(
      "SELECT payload::text FROM app.outbox_events ORDER BY created_at ASC",
    );
    const serializedOutboxPayloads = JSON.stringify(queuedPayloads.rows);
    expect(serializedOutboxPayloads).not.toContain("/chef/magic-login");
    expect(serializedOutboxPayloads).not.toContain("token=");
    expect(serializedOutboxPayloads).not.toContain("/survey/");

    const adminListEndpoints = [
      ["/api/v1/operations/chef-applications", "chef.lerato@example.test"],
      ["/api/v1/operations/customers", "owner@example.test"],
      ["/api/v1/operations/chefs", "chef.lerato@example.test"],
      ["/api/v1/operations/bookings", "CM-2026-000001"],
      ["/api/v1/operations/analytics/popular-meals?limit=1", "chicken-peri-peri"],
    ] as const;
    for (const [path, expectedText] of adminListEndpoints) {
      const response = await fetch(`${baseUrl}${path}`, {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      });
      expect(response.status).toBe(200);
      expect(JSON.stringify(await json(response))).toContain(expectedText);
    }

    const payoutsResponse = await fetch(`${baseUrl}/api/v1/operations/payouts`, {
      credentials: "include",
      headers: { Cookie: admin.cookie },
    });
    expect(payoutsResponse.status).toBe(200);
    expect(await json(payoutsResponse)).toMatchObject({ data: { items: [] } });

    const whatsappPreviewResponse = await fetch(
      `${baseUrl}/api/v1/operations/communications/whatsapp-preview`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        body: JSON.stringify({
          recipient: "+27820000000",
          templateKey: "admin_preview",
          bodyPreview: "Preview only",
          relatedBookingRequestId: accepted.data.booking.id,
          relatedUserId: magicBody.data.user.id,
        }),
      },
    );
    expect(whatsappPreviewResponse.status).toBe(201);
    expect(await json(whatsappPreviewResponse)).toMatchObject({
      data: { channel: "WHATSAPP", status: "SKIPPED", provider: "meta-disabled" },
    });
    const whatsAppOutbox = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM app.outbox_events WHERE event_type = 'communication.whatsapp.template.v1'",
    );
    expect(Number(whatsAppOutbox.rows[0]?.count ?? 0)).toBe(0);

    const chefBookingsResponse = await fetch(`${baseUrl}/api/v1/chef/bookings`, {
      credentials: "include",
      headers: { Cookie: chefCookie },
    });
    expect(chefBookingsResponse.status).toBe(200);
    expect(await json(chefBookingsResponse)).toMatchObject({
      data: { items: [expect.objectContaining({ street: "12 Jacaranda Ave" })] },
    });

    const notificationsResponse = await fetch(`${baseUrl}/api/v1/chef/notifications`, {
      credentials: "include",
      headers: { Cookie: chefCookie },
    });
    expect(notificationsResponse.status).toBe(200);
    expect(JSON.stringify(await json(notificationsResponse))).toContain("New ChefMate job");

    const surveyEmail = await sendQueuedEmail("customer.survey.invite");
    const surveyToken = tokenFromPathLink(surveyEmail.text);
    expect(surveyToken).toBeTruthy();

    const surveyResponse = await fetch(`${baseUrl}/api/v1/surveys/${surveyToken}`);
    expect(surveyResponse.status).toBe(200);
    expect(await json(surveyResponse)).toMatchObject({
      data: {
        status: "PENDING",
        bookingReference: "CM-2026-000001",
        recipientRole: "CUSTOMER",
      },
    });

    const invalidSurveyResponse = await fetch(`${baseUrl}/api/v1/surveys/${surveyToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: "No ratings" }),
    });
    expect(invalidSurveyResponse.status).toBe(400);

    const submitSurveyResponse = await fetch(`${baseUrl}/api/v1/surveys/${surveyToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealRating: 5, sessionRating: 4, comment: "Wonderful" }),
    });
    expect(submitSurveyResponse.status).toBe(200);
    expect(await json(submitSurveyResponse)).toMatchObject({ data: { status: "SUBMITTED" } });

    const submittedSurveyResponse = await fetch(`${baseUrl}/api/v1/surveys/${surveyToken}`);
    expect(submittedSurveyResponse.status).toBe(200);
    expect(await json(submittedSurveyResponse)).toMatchObject({ data: { status: "COMPLETED" } });

    const repeatSurveyResponse = await fetch(`${baseUrl}/api/v1/surveys/${surveyToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealRating: 5 }),
    });
    expect(repeatSurveyResponse.status).toBe(404);
  });
  it("guards auth and platform edge cases with stable problem responses", async () => {
    const invalidRegister = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(invalidRegister.status).toBe(400);
    expect(await json(invalidRegister)).toMatchObject({ code: "VALIDATION_FAILED" });

    const weakPassword = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Weak Password",
        email: "weak@example.test",
        password: "lowercaseonly",
      }),
    });
    expect(weakPassword.status).toBe(400);

    await registerCustomer("edge.customer@example.test", "Edge Customer");
    const duplicate = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Edge Customer",
        email: "edge.customer@example.test",
        password: "StrongPass12345",
      }),
    });
    expect(duplicate.status).toBe(409);
    expect(await json(duplicate)).toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });

    const badLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "edge.customer@example.test", password: "wrong" }),
    });
    expect(badLogin.status).toBe(401);

    const goodLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "edge.customer@example.test", password: "StrongPass12345" }),
    });
    expect(goodLogin.status).toBe(200);
    const loginCookie = cookie(goodLogin);

    await pool.query("DELETE FROM app.rate_limit_buckets WHERE key = $1", [
      "auth:login:ip:127.0.0.1",
    ]);
    await registerCustomer("limited.login@example.test", "Limited Login");
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const failedLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.77",
        },
        body: JSON.stringify({ email: "limited.login@example.test", password: "wrong" }),
      });
      expect(failedLogin.status).toBe(401);
    }
    const limitedLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.77",
      },
      body: JSON.stringify({ email: "limited.login@example.test", password: "wrong" }),
    });
    expect(limitedLogin.status).toBe(429);
    expect(await json(limitedLogin)).toMatchObject({ code: "RATE_LIMITED" });

    await pool.query("DELETE FROM app.rate_limit_buckets WHERE key = $1", [
      "auth:login:ip:127.0.0.1",
    ]);
    await registerCustomer("reset.owner@example.test", "Reset Owner");
    await registerCustomer("reset.target@example.test", "Reset Target");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failedLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reset.target@example.test", password: "wrong" }),
      });
      expect(failedLogin.status).toBe(401);
    }
    const successfulSameIpLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reset.owner@example.test", password: "StrongPass12345" }),
    });
    expect(successfulSameIpLogin.status).toBe(200);
    const throttledAfterSuccess = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reset.target@example.test", password: "wrong" }),
    });
    expect(throttledAfterSuccess.status).toBe(429);

    const deniedDashboard = await fetch(`${baseUrl}/api/v1/operations/dashboard`, {
      credentials: "include",
      headers: { Cookie: loginCookie },
    });
    expect(deniedDashboard.status).toBe(403);
    expect(await json(deniedDashboard)).toMatchObject({ code: "FORBIDDEN" });

    const deniedChefProfile = await fetch(`${baseUrl}/api/v1/chef/profile`, {
      credentials: "include",
      headers: { Cookie: loginCookie },
    });
    expect(deniedChefProfile.status).toBe(403);

    const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Cookie: loginCookie },
    });
    expect(logout.status).toBe(204);

    const revokedMe = await fetch(`${baseUrl}/api/v1/auth/me`, {
      credentials: "include",
      headers: { Cookie: loginCookie },
    });
    expect(revokedMe.status).toBe(401);

    const repeatedLogout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Cookie: loginCookie },
    });
    expect(repeatedLogout.status).toBe(204);

    const malformedLogout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=%E0%A4%A` },
    });
    expect(malformedLogout.status).toBe(204);

    const admin = await registerCustomer("edge.admin@example.test", "Edge Admin");
    await grantRole(admin.userId, "ADMIN");
    const missingPatch = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/00000000-0000-0000-0000-000000000000`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        body: JSON.stringify({ adminNotes: null }),
      },
    );
    expect(missingPatch.status).toBe(404);

    const support = await registerCustomer("edge.support@example.test", "Edge Support");
    await grantRole(support.userId, "SUPPORT");
    const supportDashboard = await fetch(`${baseUrl}/api/v1/operations/dashboard`, {
      credentials: "include",
      headers: { Cookie: support.cookie },
    });
    expect(supportDashboard.status).toBe(200);

    const supportInvite = await fetch(
      `${baseUrl}/api/v1/operations/chef-applications/00000000-0000-0000-0000-000000000000/invite`,
      {
        method: "POST",
        credentials: "include",
        headers: { Cookie: support.cookie },
      },
    );
    expect(supportInvite.status).toBe(403);

    const shortMagicLink = await fetch(`${baseUrl}/api/v1/chef/magic-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "too-short" }),
    });
    expect(shortMagicLink.status).toBe(400);

    const missingMagicLink = await fetch(`${baseUrl}/api/v1/chef/magic-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "missing-magic-link-token-with-safe-length" }),
    });
    expect(missingMagicLink.status).toBe(401);
    expect(await json(missingMagicLink)).toMatchObject({ code: "INVALID_MAGIC_LINK" });

    const invalidDateDashboard = await fetch(
      `${baseUrl}/api/v1/operations/dashboard?from=not-a-date`,
      {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(invalidDateDashboard.status).toBe(400);

    const repeatedDateDashboard = await fetch(
      `${baseUrl}/api/v1/operations/dashboard?from=2026-01-01&from=2026-01-02`,
      {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(repeatedDateDashboard.status).toBe(400);

    const reversedRangeDashboard = await fetch(
      `${baseUrl}/api/v1/operations/dashboard?from=2026-08-02&to=2026-08-01`,
      {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(reversedRangeDashboard.status).toBe(400);

    const invalidLimitDashboard = await fetch(
      `${baseUrl}/api/v1/operations/dashboard?topChefsLimit=0`,
      {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(invalidLimitDashboard.status).toBe(400);

    const datedDashboard = await fetch(
      `${baseUrl}/api/v1/operations/dashboard?from=2026-01-01&to=2026-12-31&topChefsLimit=2`,
      {
        credentials: "include",
        headers: { Cookie: admin.cookie },
      },
    );
    expect(datedDashboard.status).toBe(200);
    expect(await json(datedDashboard)).toMatchObject({
      data: {
        dateRange: {
          from: "2026-01-01T00:00:00.000Z",
          to: "2027-01-01T00:00:00.000Z",
        },
      },
    });

    const missingSurvey = await fetch(`${baseUrl}/api/v1/surveys/missing-survey-token`);
    expect(missingSurvey.status).toBe(404);

    const booking = await pool.query<{ id: string }>(
      `INSERT INTO app.bookings
         (reference, status, source, main_slug, address, subtotal_cents, discount_cents,
          total_cents, chef_payable_cents, platform_revenue_cents, idempotency_key, request_fingerprint)
       VALUES
         ('CM-EDGE-SURVEY-001', 'COMPLETED', 'coverage-edge', 'chicken-peri-peri',
          '{"area":"Fourways","street":"1 Edge Road"}'::jsonb, 1000, 0, 1000, 650, 350,
          'edge-survey-booking-001', 'edge-survey-fingerprint-001')
       RETURNING id::text`,
    );
    const expiredSurveyToken = "expired-survey-token-with-safe-length";
    await pool.query(
      `INSERT INTO app.survey_tokens (booking_id, token_hash, customer_email, status, expires_at)
       VALUES ($1, $2, 'expired.customer@example.test', 'PENDING', now() - interval '1 minute')`,
      [booking.rows[0]?.id, hashToken(expiredSurveyToken)],
    );
    const expiredSurvey = await fetch(`${baseUrl}/api/v1/surveys/${expiredSurveyToken}`);
    expect(expiredSurvey.status).toBe(404);

    const invalidSurveyRatings = [{ mealRating: 0 }, { mealRating: 6 }] as const;
    for (const payload of invalidSurveyRatings) {
      const response = await fetch(`${baseUrl}/api/v1/surveys/missing-survey-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({ code: "VALIDATION_FAILED" });
    }

    const missingSurveySubmit = await fetch(`${baseUrl}/api/v1/surveys/missing-survey-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { ignored: true }, mealRating: 5 }),
    });
    expect(missingSurveySubmit.status).toBe(404);
  });
});
