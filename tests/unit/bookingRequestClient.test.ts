import { describe, expect, it, vi } from "vitest";
import { buildBookingRequestPayload, submitBookingRequestPayload, type BookingRequestPayload } from "@/features/order-flow/api/bookingRequestClient";
import { MAINS } from "@/features/order-flow/constants/menu";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";

const payload: BookingRequestPayload = {
  source: "landing-order-flow",
  goalId: "just-good-food",
  mainSlug: "winter-oxtail-stew",
  sideSlugs: ["side-coleslaw"],
  dessertSlug: "dessert-malva",
  customRequest: null,
  scheduledDate: "2026-08-15",
  timeSlot: "18:30",
  address: { estate: "Dainfern", unit: "Unit 12", street: "12 Jacaranda Avenue", area: "Fourways" },
  contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
  giftCode: null,
};

describe("booking request client", () => {
  it("includes browser credentials so a signed-in booking can be linked to its account", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "booking-1",
            reference: "CM-TEST-0001",
            status: "REQUESTED",
            subtotalCents: 10000,
            discountCents: 0,
            totalCents: 10000,
            payment: { method: "BANK_TRANSFER", status: "PENDING", bankTransfer: null },
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    await submitBookingRequestPayload(payload, {
      idempotencyKey: "booking-request-client-key",
      baseUrl: "http://api.example.test",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.example.test/api/v1/booking-requests",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "Idempotency-Key": "booking-request-client-key" }),
      }),
    );
  });

  it("accepts a review-gated request with no payment instructions", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "booking-review-1",
            reference: "CM-REVIEW-0001",
            status: "NEEDS_REVIEW",
            subtotalCents: 0,
            discountCents: 0,
            totalCents: 0,
            payment: null,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await submitBookingRequestPayload(payload, {
      idempotencyKey: "booking-request-review-key",
      baseUrl: "http://api.example.test",
      fetchImpl,
    });

    expect(result).toMatchObject({ status: "NEEDS_REVIEW", payment: null });
  });

  it("surfaces a useful API validation message when checkout cannot proceed", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "slot_unavailable", message: "That time slot is no longer available." } }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(submitBookingRequestPayload(payload, {
      idempotencyKey: "booking-request-validation-key",
      baseUrl: "http://api.example.test",
      fetchImpl,
    })).rejects.toThrow("That time slot is no longer available.");
  });

  it("normalizes the displayed South African phone format before guest checkout", () => {
    const main = MAINS.find((item) => item.id === "chicken-peri-peri")!;
    const guestPayload = buildBookingRequestPayload({
      ...INITIAL_ORDER_STATE,
      main,
      date: "2026-08-15",
      time: "18:30",
      address: { estate: "", unit: "", street: "12 Jacaranda Avenue", area: "Fourways" },
      contact: { name: "Test Customer", email: "customer@example.test", phone: "082 123 4567" },
    });

    expect(guestPayload.contact?.phone).toBe("+27821234567");
  });
  it("omits duplicate contact data when the customer is signed in", () => {
    const main = MAINS.find((item) => item.id === "chicken-peri-peri")!;
    const signedInPayload = buildBookingRequestPayload(
      {
        ...INITIAL_ORDER_STATE,
        main,
        date: "2026-08-15",
        time: "18:30",
        address: { estate: "", unit: "", street: "12 Jacaranda Avenue", area: "Fourways" },
      },
      { useAccountContact: true },
    );

    expect(signedInPayload).not.toHaveProperty("contact");
  });
});