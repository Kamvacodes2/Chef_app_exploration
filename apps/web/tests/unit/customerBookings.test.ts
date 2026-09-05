import { describe, expect, it, vi } from "vitest";
import {
  fetchCustomerBookings,
  fetchCustomerSubscription,
} from "@/features/customer/api/customerBookingsClient";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response;
}

describe("customerBookingsClient", () => {
  it("parses a bookings list that includes free add-on (overnight oats) meals", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: {
          items: [
            {
              id: "booking-1",
              reference: "CM00366",
              status: "COMPLETED",
              type: "STANDARD",
              mainMeal: { slug: "burger-bowl", name: "Big Mac Burger Bowls" },
              meals: [
                { kind: "main", slug: "burger-bowl", name: "Big Mac Burger Bowls" },
                { kind: "addon", slug: "overnight-oats-trio", name: "Overnight Oats Trio" },
              ],
              scheduledDate: "2026-08-23",
              timeSlot: "16:00",
              createdAt: "2026-08-23T12:00:00.000Z",
            },
          ],
        },
      }),
    );
    const bookings = await fetchCustomerBookings({ baseUrl: "https://api.test", fetchImpl });
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.meals.map((meal) => meal.kind)).toEqual(["main", "addon"]);
    expect(bookings[0]?.meals[1]?.name).toBe("Overnight Oats Trio");
  });

  it("returns the subscription summary when the customer owns a package", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: {
          subscription: {
            planId: "rhythm",
            planName: "chefmate rhythm",
            planPriceCents: 199900,
            totalSessions: 4,
            sessionsUsed: 2,
            sessionsRemaining: 2,
          },
        },
      }),
    );
    const subscription = await fetchCustomerSubscription({
      baseUrl: "https://api.test",
      fetchImpl,
    });
    expect(subscription).toMatchObject({ planId: "rhythm", sessionsUsed: 2, sessionsRemaining: 2 });
  });

  it("returns null when the customer has no package", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: { subscription: null } }));
    const subscription = await fetchCustomerSubscription({
      baseUrl: "https://api.test",
      fetchImpl,
    });
    expect(subscription).toBeNull();
  });
});
