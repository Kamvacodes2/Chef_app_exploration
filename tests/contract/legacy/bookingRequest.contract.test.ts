import { describe, expect, it } from "vitest";
import {
  bookingRequestFingerprint,
  buildBookingRequestPayload,
  submitBookingRequestPayload,
  type BookingRequestPayload,
} from "@/features/order-flow/api/bookingRequestClient";
import { MAINS, SIDES } from "@/features/order-flow/constants/menu";
import { INITIAL_ORDER_STATE, type OrderState } from "@/features/order-flow/state/orderReducer";
import { fakeFetch, wireRequest } from "./support/fakeFetch";
import { LEGACY_BASE_URL, legacyBookingResponse } from "./support/fixtures";

/**
 * Legacy contract 9: POST /api/v1/booking-requests.
 *
 * Provider status: consumer expectation only (D001). This is the only client
 * that sends `Idempotency-Key`, and the only one whose response carries the
 * legacy 8-value booking status enum plus payment instructions.
 * All bank values in fixtures are fabricated.
 */
const IDEMPOTENCY_KEY = "synthetic-idempotency-key-0001";

function guestOrderState(): OrderState {
  const main = MAINS[0];
  const side = SIDES[0];
  if (!main || !side) throw new Error("Legacy menu constants are unexpectedly empty.");

  return {
    ...INITIAL_ORDER_STATE,
    goalId: "just-good-food",
    main,
    sides: [side],
    date: "2026-08-15",
    time: "18:30",
    address: {
      estate: "  Dainfern  ",
      unit: "  Unit 12  ",
      street: "  12 Jacaranda Avenue  ",
      area: "  Fourways  ",
      latitude: null,
      longitude: null,
    },
    contact: {
      name: "  Thandi Customer  ",
      email: "  Thandi.Customer@Example.TEST  ",
      phone: "082 123 4567",
    },
  };
}

const wirePayload: BookingRequestPayload = {
  source: "landing-order-flow",
  goalId: "just-good-food",
  mainSlug: "winter-oxtail-stew",
  sideSlugs: ["side-coleslaw"],
  dessertSlug: null,
  customRequest: null,
  scheduledDate: "2026-08-15",
  timeSlot: "18:30",
  address: { estate: "Dainfern", unit: "Unit 12", street: "12 Jacaranda Avenue", area: "Fourways" },
  contact: {
    name: "Thandi Customer",
    email: "thandi.customer@example.test",
    phone: "+27821234567",
  },
  giftCode: null,
};

describe("legacy contract: booking submission", () => {
  it("pins the submission request wire shape, including the Idempotency-Key header", async () => {
    const fetchImpl = fakeFetch({ status: 201, body: legacyBookingResponse });

    await submitBookingRequestPayload(wirePayload, {
      idempotencyKey: IDEMPOTENCY_KEY,
      baseUrl: LEGACY_BASE_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const request = wireRequest(fetchImpl);
    expect(request.method).toBe("POST");
    expect(request.pathname).toBe("/api/v1/booking-requests");
    expect(request.credentials).toBe("include");
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      "Idempotency-Key": IDEMPOTENCY_KEY,
    });
    expect(request.hasAbortSignal).toBe(false);
    expect(request.body).toEqual(wirePayload);
  });

  it("pins client-side normalization: trimmed address, lowercased email, +27 phone", () => {
    expect(buildBookingRequestPayload(guestOrderState())).toMatchObject({
      address: {
        estate: "Dainfern",
        unit: "Unit 12",
        street: "12 Jacaranda Avenue",
        area: "Fourways",
      },
      contact: {
        name: "Thandi Customer",
        email: "thandi.customer@example.test",
        phone: "+27821234567",
      },
    });
  });

  it("pins the exact legacy phone normalization rules", () => {
    const cases: readonly (readonly [string, string])[] = [
      ["082 123 4567", "+27821234567"],
      ["0821234567", "+27821234567"],
      ["(082) 123-4567", "+27821234567"],
      ["0027821234567", "+27821234567"],
      ["+27821234567", "+27821234567"],
      ["27821234567", "27821234567"],
    ];

    for (const [input, expected] of cases) {
      const state = guestOrderState();
      const built = buildBookingRequestPayload({
        ...state,
        contact: { ...state.contact, phone: input },
      });
      expect(built.contact?.phone).toBe(expected);
    }
  });

  it("rejects a phone number that fails the legacy pattern", () => {
    const state = guestOrderState();
    expect(() =>
      buildBookingRequestPayload({ ...state, contact: { ...state.contact, phone: "12345" } }),
    ).toThrow("A valid contact phone number is required.");
  });

  it("omits contact entirely for a signed-in customer", () => {
    const built = buildBookingRequestPayload(guestOrderState(), { useAccountContact: true });
    expect("contact" in built).toBe(false);
  });

  it("pins the key-order-dependent fingerprint used for duplicate suppression", () => {
    expect(bookingRequestFingerprint(wirePayload)).toBe(JSON.stringify(wirePayload));

    // Reordering keys produces a different fingerprint: the legacy fingerprint is
    // JSON.stringify of the payload, not a canonicalized hash.
    const reordered = { ...wirePayload, goalId: wirePayload.goalId } as BookingRequestPayload;
    const { source, ...rest } = reordered;
    expect(bookingRequestFingerprint({ ...rest, source } as BookingRequestPayload)).not.toBe(
      bookingRequestFingerprint(wirePayload),
    );
  });

  it("pins the booking response projection, including bank-transfer instructions", async () => {
    const fetchImpl = fakeFetch({ status: 201, body: legacyBookingResponse });

    await expect(
      submitBookingRequestPayload(wirePayload, {
        idempotencyKey: IDEMPOTENCY_KEY,
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual({
      ...legacyBookingResponse.data,
      payment: {
        ...legacyBookingResponse.data.payment,
        provider: "BANK_TRANSFER",
        paystack: null,
      },
    });
  });

  it("accepts Paystack, bank transfer, and the 8-value legacy status enum", async () => {
    const legacyStatuses = [
      "REQUESTED",
      "NEEDS_REVIEW",
      "CONFIRMED",
      "AWAITING_CHEF",
      "CHEF_MATCHED",
      "EN_ROUTE",
      "CANCELLED",
      "COMPLETED",
    ] as const;

    for (const status of legacyStatuses) {
      const fetchImpl = fakeFetch({
        status: 201,
        body: { data: { ...legacyBookingResponse.data, status, payment: null } },
      });
      await expect(
        submitBookingRequestPayload(wirePayload, {
          idempotencyKey: IDEMPOTENCY_KEY,
          baseUrl: LEGACY_BASE_URL,
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
      ).resolves.toMatchObject({ status });
    }

    // Blueprint section 7.3 booking states are NOT accepted by the legacy parser.
    const blueprintStatus = fakeFetch({
      status: 201,
      body: { data: { ...legacyBookingResponse.data, status: "READY_TO_DISPATCH", payment: null } },
    });
    await expect(
      submitBookingRequestPayload(wirePayload, {
        idempotencyKey: IDEMPOTENCY_KEY,
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: blueprintStatus as unknown as typeof fetch,
      }),
    ).rejects.toThrow();

    const paystack = fakeFetch({
      status: 201,
      body: {
        data: {
          ...legacyBookingResponse.data,
          payment: {
            method: "PAYSTACK",
            status: "PENDING",
            bankTransfer: null,
            paystack: {
              authorizationUrl: "https://checkout.paystack.com/test-auth",
              accessCode: "test-access-code",
            },
          },
        },
      },
    });
    await expect(
      submitBookingRequestPayload(wirePayload, {
        idempotencyKey: IDEMPOTENCY_KEY,
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: paystack as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({
      payment: {
        method: "PAYSTACK",
        provider: "PAYSTACK",
        bankTransfer: null,
        paystack: {
          authorizationUrl: "https://checkout.paystack.com/test-auth",
          accessCode: "test-access-code",
        },
      },
    });
  });

  it("uses readApiErrorMessage on failure, unlike the quote and availability clients", async () => {
    const fetchImpl = fakeFetch({
      status: 409,
      body: { error: { message: "A matching request already exists" } },
    });

    await expect(
      submitBookingRequestPayload(wirePayload, {
        idempotencyKey: IDEMPOTENCY_KEY,
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("A matching request already exists");

    const bare = fakeFetch({ status: 500, bodyThrows: true });
    await expect(
      submitBookingRequestPayload(wirePayload, {
        idempotencyKey: IDEMPOTENCY_KEY,
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: bare as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Chefmate booking request failed (500)");
  });

  it("throws a configuration error when the resolved base URL is empty", async () => {
    const fetchImpl = fakeFetch({ status: 201, body: legacyBookingResponse });

    await expect(
      submitBookingRequestPayload(wirePayload, {
        idempotencyKey: IDEMPOTENCY_KEY,
        baseUrl: "  ",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Chefmate API URL is not configured.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
