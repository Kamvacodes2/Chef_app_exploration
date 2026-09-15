import { describe, expect, it, vi } from "vitest";
import {
  fetchCustomerBookings,
  fetchCustomerSubscription,
  modifyCustomerBooking,
  rescheduleCustomerBooking,
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

  it("sends order and schedule modifications and returns updated booking", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      const parsedBody = JSON.parse((init?.body as string) ?? "{}");
      return jsonResponse({
        data: {
          id: "booking-123",
          reference: "CM00475",
          status: "REQUESTED",
          type: "SUBSCRIPTION",
          mainMeal: { slug: parsedBody.mainMealSlug, name: parsedBody.mainName },
          meals: [
            { kind: "main", slug: parsedBody.mainMealSlug, name: parsedBody.mainName },
            { kind: "addon", slug: "overnight-oats-trio", name: "Overnight Oats Trio" },
          ],
          customRequest: parsedBody.customRequest,
          address: parsedBody.address,
          scheduledDate: parsedBody.scheduledDate,
          timeSlot: parsedBody.timeSlot,
          createdAt: "2026-09-15T00:00:00.000Z",
        },
      });
    });

    const modified = await modifyCustomerBooking(
      "booking-123",
      {
        scheduledDate: "2026-09-20",
        timeSlot: "18:00",
        mainMealSlug: "sa-roast-chicken-seven-colours",
        mainName: "SA Roast Chicken (Seven Colours)",
        sideSlugs: ["side-seven-colours"],
        breakfastAddOnSlug: "overnight-oats-trio",
        customRequest: "No spicy peppers",
        address: {
          street: "97 Waterfall Ave",
          unit: "Unit 1",
          estate: "Craighall",
          serviceArea: "Craighall",
        },
      },
      { baseUrl: "https://api.test", fetchImpl },
    );

    expect(modified.reference).toBe("CM00475");
    expect(modified.scheduledDate).toBe("2026-09-20");
    expect(modified.mainMeal.name).toBe("SA Roast Chicken (Seven Colours)");
    expect(modified.customRequest).toBe("No spicy peppers");
    expect(modified.address?.street).toBe("97 Waterfall Ave");
  });

  it("reschedules a booking successfully", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      const parsedBody = JSON.parse((init?.body as string) ?? "{}");
      return jsonResponse({
        data: {
          id: "booking-123",
          reference: "CM00475",
          status: "REQUESTED",
          type: "STANDARD",
          mainMeal: { slug: "burger-bowl", name: "Big Mac Burger Bowls" },
          meals: [{ kind: "main", slug: "burger-bowl", name: "Big Mac Burger Bowls" }],
          scheduledDate: parsedBody.scheduledDate,
          timeSlot: parsedBody.timeSlot,
          createdAt: "2026-09-15T00:00:00.000Z",
        },
      });
    });

    const rescheduled = await rescheduleCustomerBooking(
      "booking-123",
      { scheduledDate: "2026-09-25", timeSlot: "17:00", reason: "Rescheduling" },
      { baseUrl: "https://api.test", fetchImpl },
    );

    expect(rescheduled.scheduledDate).toBe("2026-09-25");
    expect(rescheduled.timeSlot).toBe("17:00");
  });

  it("throws descriptive error when fetchCustomerBookings fails", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: false,
          json: async () => ({ message: "Unauthorized access" }),
        }) as unknown as Response,
    );

    await expect(fetchCustomerBookings({ baseUrl: "https://api.test", fetchImpl })).rejects.toThrow(
      "Unauthorized access",
    );
  });

  it("throws descriptive error when fetchCustomerSubscription fails", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: false,
          json: async () => ({ message: "Subscription not found" }),
        }) as unknown as Response,
    );

    await expect(
      fetchCustomerSubscription({ baseUrl: "https://api.test", fetchImpl }),
    ).rejects.toThrow("Subscription not found");
  });

  it("throws descriptive error when rescheduleCustomerBooking fails", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: false,
          json: async () => ({ message: "Chef unavailable at this time" }),
        }) as unknown as Response,
    );

    await expect(
      rescheduleCustomerBooking(
        "booking-123",
        { scheduledDate: "2026-09-25", timeSlot: "17:00" },
        { baseUrl: "https://api.test", fetchImpl },
      ),
    ).rejects.toThrow("Chef unavailable at this time");
  });

  it("throws descriptive error when modifyCustomerBooking fails", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: false,
          json: async () => ({ message: "Cannot modify completed order" }),
        }) as unknown as Response,
    );

    await expect(
      modifyCustomerBooking(
        "booking-123",
        { scheduledDate: "2026-09-25" },
        { baseUrl: "https://api.test", fetchImpl },
      ),
    ).rejects.toThrow("Cannot modify completed order");
  });
});
