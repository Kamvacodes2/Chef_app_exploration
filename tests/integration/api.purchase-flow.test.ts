import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { buildApp } from "../../apps/api/src/app.js";
import { ANONYMOUS_BOOKING_COOKIE_NAME } from "../../apps/api/src/routes/bookingRequests.js";
import { createPool, migrate } from "../../packages/database/src/index.js";
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

function silentLogger() {
  return createLogger({ name: "purchase-flow-test-api", level: "silent" });
}

async function json(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

function responseCookie(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("expected Set-Cookie header");
  return value.split(";")[0] ?? value;
}

beforeAll(async () => {
  database = await provisionDisposablePostgres();
  await migrate({ connectionString: database.connectionString, migrationsDir: MIGRATIONS_DIR });

  pool = createPool({
    connectionString: database.connectionString,
    applicationName: "purchase-flow-test",
  });
  app = await buildApp({ logger: silentLogger(), pool });
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

describe("frontend purchase-flow API", () => {
  it("serves a catalog without per-main customer prices", async () => {
    const categoriesResponse = await fetch(`${baseUrl}/api/v1/catalog/categories`);
    expect(categoriesResponse.status).toBe(200);
    expect(await json(categoriesResponse)).toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ slug: "chefmate-signatures" })]),
    });

    const mealsResponse = await fetch(`${baseUrl}/api/v1/catalog/meals?category=chicken`);
    expect(mealsResponse.status).toBe(200);
    const body = (await json(mealsResponse)) as {
      data: Array<{ slug: string; priceDisplay: string }>;
    };
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "chicken-peri-peri", priceDisplay: "Included in plan" }),
      ]),
    );
  });

  it("quotes plan-only checkout with side overage and dessert charges", async () => {
    const response = await fetch(`${baseUrl}/api/v1/booking-requests/quote`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mainSlug: "chicken-peri-peri",
        sideSlugs: ["side-coleslaw", "side-mielies", "side-creamed-spinach"],
        dessertSlug: "dessert-malva",
        customRequest: null,
        giftCode: null,
      }),
    });

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: {
        subtotalCents: 67_285,
        discountCents: 0,
        totalCents: 67_285,
        plan: expect.objectContaining({ id: "tonight", priceCents: 52_785 }),
        items: [
          expect.objectContaining({ kind: "main", priceCents: 0 }),
          expect.objectContaining({ kind: "side", slug: "side-coleslaw", priceCents: 0 }),
          expect.objectContaining({ kind: "side", slug: "side-mielies", priceCents: 0 }),
          expect.objectContaining({
            kind: "side",
            slug: "side-creamed-spinach",
            priceCents: 5_500,
          }),
          expect.objectContaining({ kind: "dessert", slug: "dessert-malva", priceCents: 9_000 }),
        ],
      },
    });
  });

  it("provides advisory availability slots to the frontend", async () => {
    const response = await fetch(`${baseUrl}/api/v1/availability/slots?date=2026-08-15`);
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      data: {
        date: "2026-08-15",
        slots: expect.arrayContaining([
          { period: "evening", time: "18:30", label: "6:30 PM", available: true },
        ]),
      },
    });
  });

  it("creates an idempotent persisted booking with bank-transfer instructions", async () => {
    const payload = {
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
    };

    const first = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "purchase-flow-001" },
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(201);
    const firstBody = (await json(first)) as { data: { id: string; reference: string } };
    expect(firstBody).toMatchObject({
      data: {
        status: "REQUESTED",
        subtotalCents: 67_285,
        totalCents: 67_285,
        payment: {
          method: "BANK_TRANSFER",
          status: "PENDING",
          bankTransfer: expect.objectContaining({ paymentReference: firstBody.data.reference }),
        },
      },
    });

    const anonymousCookie = responseCookie(first);
    expect(anonymousCookie).toContain(`${ANONYMOUS_BOOKING_COOKIE_NAME}=`);

    const stored = await pool.query<{ total_cents: number; chef_payable_cents: number }>(
      "SELECT total_cents, chef_payable_cents FROM app.bookings WHERE id = $1",
      [firstBody.data.id],
    );
    expect(stored.rows[0]).toEqual({ total_cents: 67_285, chef_payable_cents: 43_735 });

    const foreignAnonymousReplay = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "purchase-flow-001" },
      body: JSON.stringify(payload),
    });
    expect(foreignAnonymousReplay.status).toBe(409);
    expect(await json(foreignAnonymousReplay)).toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const second = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "purchase-flow-001",
        Cookie: anonymousCookie,
      },
      body: JSON.stringify(payload),
    });
    expect(second.status).toBe(200);
    expect((await json(second)) as unknown).toMatchObject({ data: { id: firstBody.data.id } });

    const conflictingReplay = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "purchase-flow-001",
        Cookie: anonymousCookie,
      },
      body: JSON.stringify({ ...payload, timeSlot: "19:00" }),
    });
    expect(conflictingReplay.status).toBe(409);
    expect(await json(conflictingReplay)).toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
  });

  it("handles concurrent same-key booking submissions as replay instead of errors", async () => {
    const payload = {
      source: "landing-order-flow",
      goalId: "just-good-food",
      mainSlug: "chicken-peri-peri",
      sideSlugs: ["side-coleslaw"],
      dessertSlug: null,
      customRequest: null,
      scheduledDate: "2026-08-17",
      timeSlot: "18:30",
      address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
      contact: { name: "Parallel Customer", email: "parallel@example.test", phone: "+27821234567" },
      giftCode: null,
    };
    const anonymousCookie = `${ANONYMOUS_BOOKING_COOKIE_NAME}=parallel-client-token-0001`;
    const [first, second] = await Promise.all([
      fetch(`${baseUrl}/api/v1/booking-requests`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "purchase-flow-concurrent-001",
          Cookie: anonymousCookie,
        },
        body: JSON.stringify(payload),
      }),
      fetch(`${baseUrl}/api/v1/booking-requests`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "purchase-flow-concurrent-001",
          Cookie: anonymousCookie,
        },
        body: JSON.stringify(payload),
      }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    const bodies = (await Promise.all([json(first), json(second)])) as Array<{
      data: { id: string };
    }>;
    expect(bodies[0]?.data.id).toBe(bodies[1]?.data.id);
    const count = await pool.query<{ count: string }>(
      "SELECT count(*)::text FROM app.bookings WHERE idempotency_key = $1",
      ["purchase-flow-concurrent-001"],
    );
    expect(count.rows[0]?.count).toBe("1");
  });

  it("handles catalog, availability and booking validation branches", async () => {
    const allMeals = await fetch(`${baseUrl}/api/v1/catalog/meals`);
    expect(allMeals.status).toBe(200);
    expect(JSON.stringify(await json(allMeals))).toContain("chicken-peri-peri");

    const meal = await fetch(`${baseUrl}/api/v1/catalog/meals/chicken-peri-peri`);
    expect(meal.status).toBe(200);
    expect(await json(meal)).toMatchObject({ data: { slug: "chicken-peri-peri" } });

    const missingMeal = await fetch(`${baseUrl}/api/v1/catalog/meals/no-such-meal`);
    expect(missingMeal.status).toBe(404);
    expect(await json(missingMeal)).toMatchObject({ code: "NOT_FOUND" });

    for (const suffix of ["", "?date=not-a-date"] as const) {
      const unavailable = await fetch(`${baseUrl}/api/v1/availability/slots${suffix}`);
      expect(unavailable.status).toBe(400);
      expect(await json(unavailable)).toMatchObject({ code: "VALIDATION_FAILED" });
    }

    const invalidQuoteBodies = [
      null,
      { mainSlug: "chicken-peri-peri", sideSlugs: "side-coleslaw", dessertSlug: null },
      { mainSlug: "", sideSlugs: [], dessertSlug: null },
      {
        mainSlug: "chicken-peri-peri",
        sideSlugs: [],
        dessertSlug: 12,
        customRequest: null,
        giftCode: null,
      },
    ];
    for (const body of invalidQuoteBodies) {
      const response = await fetch(`${baseUrl}/api/v1/booking-requests/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }

    const validPayload = {
      source: "landing-order-flow",
      goalId: "just-good-food",
      mainSlug: "chicken-peri-peri",
      sideSlugs: [],
      dessertSlug: null,
      customRequest: null,
      scheduledDate: "2026-08-15",
      timeSlot: "18:30",
      address: { street: "12 Jacaranda Ave", area: "Fourways" },
      contact: { name: "Test Customer", email: "customer@example.test" },
      giftCode: null,
    };

    const missingIdempotency = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    expect(missingIdempotency.status).toBe(400);

    for (const [field, value] of [
      ["source", "other"],
      ["scheduledDate", "15-08-2026"],
      ["timeSlot", "evening"],
      ["address", null],
    ] as const) {
      const response = await fetch(`${baseUrl}/api/v1/booking-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `invalid-${field}` },
        body: JSON.stringify({ ...validPayload, [field]: value }),
      });
      expect(response.status).toBe(400);
    }

    const customRequest = await fetch(`${baseUrl}/api/v1/booking-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "custom-review-001" },
      body: JSON.stringify({
        ...validPayload,
        mainSlug: "custom-request",
        customRequest: "Please build a birthday menu around lamb.",
        planSelection: {
          planId: "family",
          preferredDays: ["Monday", 123, "Wednesday"],
          schedulePreference: " evenings ",
          favoriteMealSlug: "chicken-peri-peri",
        },
      }),
    });
    expect(customRequest.status).toBe(201);
    expect(await json(customRequest)).toMatchObject({
      data: { status: "NEEDS_REVIEW", payment: null },
    });
  });
});
