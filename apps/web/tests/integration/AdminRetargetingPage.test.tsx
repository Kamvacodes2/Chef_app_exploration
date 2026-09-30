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
  retargetEmail: null,
  paymentReminder: null,
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
        screen.getByText(
          "Paystack payment link reminder queued for CM00665. Refresh to confirm delivery on the row.",
        ),
      ).toBeInTheDocument();
    });

    const reminderCall = fetchMock.mock.calls.find((entry) =>
      entry[0].toString().endsWith("/payment-reminder"),
    );
    expect(reminderCall?.[1]).toMatchObject({ method: "POST" });
  });

  it("shows the payment reminder delivery state once the email worker has sent it", async () => {
    const delivered = {
      ...booking,
      paymentReminder: {
        status: "SENT",
        sentAt: "2026-09-30T20:52:01.000Z",
        lastError: null,
        attempts: 1,
        openedAt: null,
        openCount: 0,
        clickedAt: null,
        clickCount: 0,
      },
    };
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [delivered] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminRetargetingPage />);

    expect(await screen.findByText(/Payment reminder delivered/)).toBeInTheDocument();
  });

  it("prefers the open and click signal over plain delivery", async () => {
    const engaged = {
      ...booking,
      paymentReminder: {
        status: "SENT",
        sentAt: "2026-09-30T20:52:01.000Z",
        lastError: null,
        attempts: 1,
        openedAt: "2026-09-30T21:00:00.000Z",
        openCount: 2,
        clickedAt: "2026-09-30T21:05:00.000Z",
        clickCount: 1,
      },
    };
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [engaged] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminRetargetingPage />);

    expect(await screen.findByText(/Payment reminder link clicked/)).toBeInTheDocument();
  });

  it("shows an open signal when the reminder was opened but not clicked", async () => {
    const opened = {
      ...booking,
      paymentReminder: {
        status: "SENT",
        sentAt: "2026-09-30T20:52:01.000Z",
        lastError: null,
        attempts: 1,
        openedAt: "2026-09-30T21:00:00.000Z",
        openCount: 1,
        clickedAt: null,
        clickCount: 0,
      },
    };
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [opened] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminRetargetingPage />);

    expect(await screen.findByText(/Payment reminder opened/)).toBeInTheDocument();
  });

  it("shows retarget win-back engagement", async () => {
    const engaged = {
      ...booking,
      retargetEmail: {
        status: "SENT",
        sentAt: "2026-09-29T10:00:05.000Z",
        lastError: null,
        attempts: 1,
        openedAt: "2026-09-29T11:00:00.000Z",
        openCount: 1,
        clickedAt: null,
        clickCount: 0,
      },
    };
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [engaged] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminRetargetingPage />);

    expect(await screen.findByText(/Retarget email opened/)).toBeInTheDocument();
  });

  it("surfaces a failed reminder with its reason", async () => {
    const failed = {
      ...booking,
      paymentReminder: {
        status: "FAILED",
        sentAt: null,
        lastError: "smtp timeout",
        attempts: 3,
        openedAt: null,
        openCount: 0,
        clickedAt: null,
        clickCount: 0,
      },
    };
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [failed] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminRetargetingPage />);

    expect(await screen.findByText(/Payment reminder failed: smtp timeout/)).toBeInTheDocument();
  });
});
