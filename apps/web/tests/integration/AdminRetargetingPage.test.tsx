import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRetargetingPage } from "@/features/platform/AdminRetargetingPage";

const booking = {
  bookingId: "booking-1",
  reference: "CM00665",
  status: "REQUESTED",
  bookingType: "STANDARD",
  mainName: "Winter Oxtail Stew",
  scheduledDate: "2026-10-02",
  timeSlot: "18:30",
  totalCents: 52785,
  contactName: "Customer",
  contactEmail: "customer@example.com",
  paymentStatus: "PENDING",
  isTestBooking: false,
  retargetEmailSentAt: null,
  createdAt: "2026-09-28T09:00:00.000Z",
};

describe("Admin Retargeting page", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(async (url: string | URL) => {
      const path = url.toString();
      if (path.includes("/api/v1/operations/retargeting")) {
        return { ok: true, status: 200, json: async () => ({ data: { items: [booking] } }) };
      }
      if (path.endsWith("/reschedule")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { ...booking, scheduledDate: "2026-10-01", timeSlot: "18:00" },
          }),
        };
      }
      if (path.endsWith("/payment-reminder")) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              bookingId: booking.bookingId,
              queued: true,
              authorizationUrl: "https://checkout.paystack.com/cm00665-test",
            },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "prompt").mockReturnValueOnce("2026-10-01").mockReturnValueOnce("18:00");
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reschedules the session and queues a reminder with the Paystack checkout link", async () => {
    render(<AdminRetargetingPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Change date/time" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((entry) =>
        entry[0].toString().endsWith("/reschedule"),
      );
      expect(call).toBeDefined();
      expect(call?.[1]).toMatchObject({
        method: "PATCH",
        body: JSON.stringify({
          scheduledDate: "2026-10-01",
          timeSlot: "18:00",
          reason: "Rescheduled by admin at customer request",
        }),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Send payment link" }));
    await waitFor(() => {
      expect(
        screen.getByText("Paystack payment link reminder queued for CM00665."),
      ).toBeInTheDocument();
    });

    const reminderCall = fetchMock.mock.calls.find((entry) =>
      entry[0].toString().endsWith("/payment-reminder"),
    );
    expect(reminderCall?.[1]).toMatchObject({ method: "POST" });
  });
});
