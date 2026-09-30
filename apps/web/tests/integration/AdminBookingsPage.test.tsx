import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "@/app/admin/bookings/page";

function operationsBooking(overrides: Record<string, unknown>) {
  return {
    id: "b-1",
    reference: "CM00625",
    status: "AWAITING_CHEF",
    type: "SUBSCRIPTION",
    source: "LANDING_ORDER_FLOW",
    idempotencyKey: "idem-1",
    idempotencyPayloadHash: "hash-1",
    customerId: "cust-1",
    mainMealSlug: "winter-oxtail-stew",
    mainName: "Custom Request",
    customRequest: null,
    scheduledDate: "2026-09-30",
    timeSlot: "13:00",
    estate: null,
    unit: null,
    street: "12 Jacaranda Avenue",
    serviceArea: "Sunninghill",
    contactName: "Sazi Mzileni",
    contactEmail: "sazileni@gmail.com",
    contactPhone: "+27821234567",
    goalId: null,
    createdAt: "2026-09-28T09:00:00.000Z",
    cook: null,
    alignedChefs: [],
    payment: {
      id: "pay-1",
      status: "VERIFIED",
      method: "CARD",
      amountCents: 0,
      verifiedAt: "2026-09-28T09:00:00.000Z",
    },
    ...overrides,
  };
}

const awaitingChefBooking = operationsBooking({});
const assignedBooking = operationsBooking({
  id: "b-2",
  reference: "CM00545",
  status: "CHEF_MATCHED",
  cook: {
    id: "chef-1",
    email: "thandoteemanyoni@gmail.com",
    displayName: "Thando Manyoni",
    roles: ["CHEF"],
  },
});
const cancelledBooking = operationsBooking({
  id: "b-3",
  reference: "CM00626",
  status: "CANCELLED",
  cook: null,
});

const resendResponse = {
  data: {
    bookingId: "b-1",
    chefsNotified: 8,
    offersReopened: 7,
    offersCreated: 1,
    expiresAt: "2026-09-28T11:38:40.483Z",
  },
};

describe("Admin bookings page", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(async (url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/resend-offers")) {
        return { ok: true, status: 200, json: async () => resendResponse };
      }
      if (urlStr.includes("/api/v1/operations/booking-requests")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { items: [awaitingChefBooking, assignedBooking, cancelledBooking] },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resends the chef offers for an awaiting-chef booking and reports the result", async () => {
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("CM00625")).toBeInTheDocument();
    });

    // Only a booking still waiting on a chef can be sent out again.
    const resendButtons = screen.getAllByRole("button", { name: "Resend offer to all chefs" });
    expect(resendButtons).toHaveLength(1);

    fireEvent.click(resendButtons[0]!);

    await waitFor(() => {
      expect(
        screen.getByText("CM00625 sent to 8 chefs again (7 reopened, 1 new)."),
      ).toBeInTheDocument();
    });

    const resendCall = fetchMock.mock.calls.find((call) =>
      call[0].toString().includes("/resend-offers"),
    );
    expect(resendCall?.[0].toString()).toBe(
      "http://localhost:3001/api/v1/operations/booking-requests/b-1/resend-offers",
    );
    expect(resendCall?.[1]).toMatchObject({ method: "POST" });

    // The list is reloaded so the row reflects the fresh broadcast.
    expect(
      fetchMock.mock.calls.filter((call) =>
        call[0].toString().includes("/api/v1/operations/booking-requests"),
      ).length,
    ).toBeGreaterThan(1);
  });

  it("keeps cancelled bookings out of the default view and under the Cancelled tab", async () => {
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("CM00625")).toBeInTheDocument();
    });

    // Default "All Bookings" tab excludes cancelled orders entirely.
    expect(screen.queryByText("CM00626")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All Bookings \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelled \(1\)/ })).toBeInTheDocument();

    // They remain visible under the explicit Cancelled audit tab.
    fireEvent.click(screen.getByRole("button", { name: /Cancelled \(1\)/ }));
    expect(screen.getByText("CM00626")).toBeInTheDocument();
    expect(screen.queryByText("CM00625")).not.toBeInTheDocument();
  });

  it("does not resend when the admin backs out of the confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText("CM00625")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Resend offer to all chefs" }));

    await waitFor(() => {
      expect(screen.queryByText(/sent to 8 chefs again/)).not.toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some((call) => call[0].toString().includes("/resend-offers"))).toBe(
      false,
    );
  });
});
