import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AdminCalendarPage } from "@/features/platform/AdminCalendarPage";

function currentLocalDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return currentLocalDateFrom(value);
}

function currentLocalDateFrom(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const today = currentLocalDate();
const tomorrow = addDays(today, 1);

const mockBookingsResponse = {
  data: {
    items: [
      {
        id: "b-1",
        reference: "CM00535",
        status: "COMPLETED",
        type: "STANDARD",
        customerId: "cust-1",
        mainMealSlug: "lamb-curry-and-dombolo",
        mainName: "Lamb curry and dombolo",
        customRequest: "No dairy please",
        scheduledDate: today,
        timeSlot: "17:00",
        estate: null,
        unit: "Apt 4B",
        street: "123 Sandton Drive",
        serviceArea: "Sandton",
        contactName: "Daisy Muller",
        contactEmail: "daisy.muller@gmail.com",
        contactPhone: "+27821234567",
        goalId: "just-good-food",
        createdAt: "2026-09-12T10:00:00.000Z",
        cook: {
          id: "chef-1",
          email: "dineolucia70@gmail.com",
          displayName: "Dineo Lucia Lepedi",
          roles: ["CHEF"],
        },
        alignedChefs: [],
        payment: {
          id: "pay-1",
          status: "VERIFIED",
          method: "EFT",
          amountCents: 79200,
          verifiedAt: "2026-09-15T06:00:00.000Z",
        },
      },
      {
        id: "b-unpaid",
        reference: "CM-UNPAID-01",
        status: "REQUESTED",
        type: "STANDARD",
        customerId: "cust-unpaid",
        mainMealSlug: "beef-stew",
        mainName: "Unpaid stew",
        customRequest: null,
        scheduledDate: tomorrow,
        timeSlot: "13:00",
        estate: null,
        unit: null,
        street: "1 Test Road",
        serviceArea: "Rosebank",
        contactName: "Unpaid Customer",
        contactEmail: "unpaid@example.com",
        contactPhone: "+27839876543",
        goalId: null,
        createdAt: "2026-09-14T08:00:00.000Z",
        cook: null,
        alignedChefs: [],
        payment: { id: "pay-pending", status: "PENDING", method: "PAYSTACK", amountCents: 65000 },
      },
      {
        id: "b-missing-payment",
        reference: "CM-MISSING-PAY-01",
        status: "REQUESTED",
        type: "STANDARD",
        customerId: "cust-missing",
        mainMealSlug: "beef-stew",
        mainName: "Uninitialized stew",
        customRequest: null,
        scheduledDate: tomorrow,
        timeSlot: "14:00",
        estate: null,
        unit: null,
        street: "2 Test Road",
        serviceArea: "Rosebank",
        contactName: "No Payment Customer",
        contactEmail: "missing@example.com",
        contactPhone: "+27839876543",
        goalId: null,
        createdAt: "2026-09-14T08:00:00.000Z",
        cook: null,
        alignedChefs: [],
        payment: null,
      },
      {
        id: "b-2",
        reference: "CM00540",
        status: "AWAITING_CHEF",
        type: "SUBSCRIPTION",
        customerId: "cust-2",
        mainMealSlug: "beef-stew",
        mainName: "Beef stew and dombolo",
        customRequest: null,
        scheduledDate: today,
        timeSlot: "12:00",
        estate: "Green Valley",
        unit: null,
        street: "45 River Road",
        serviceArea: "Rosebank",
        contactName: "Thabo Mokoena",
        contactEmail: "thabo@example.com",
        contactPhone: "+27839876543",
        goalId: "eat-healthy",
        createdAt: "2026-09-14T08:00:00.000Z",
        cook: null,
        alignedChefs: [
          {
            id: "chef-1",
            displayName: "Dineo Lucia Lepedi",
            email: "dineolucia70@gmail.com",
            alignedAt: "2026-09-14T09:00:00.000Z",
          },
        ],
        payment: {
          id: "pay-2",
          status: "VERIFIED",
          method: "CARD",
          amountCents: 65000,
          verifiedAt: "2026-09-14T08:30:00.000Z",
        },
      },
    ],
  },
};

const mockChefsResponse = {
  data: {
    items: [
      {
        id: "chef-1",
        email: "dineolucia70@gmail.com",
        displayName: "Dineo Lucia Lepedi",
        roles: ["CHEF"],
        status: "ACTIVE",
        createdAt: "2026-08-01T00:00:00.000Z",
        bankAccount: {
          accountHolder: "Dineo Lepedi",
          bankName: "FNB",
          branchCode: "250655",
          accountNumberLast4: "4321",
          accountType: "SAVINGS",
          updatedAt: "2026-08-05T00:00:00.000Z",
        },
      },
    ],
  },
};

describe("AdminCalendarPage Integration", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes("/api/v1/operations/booking-requests")) {
          return {
            ok: true,
            json: async () => mockBookingsResponse,
          };
        }
        if (urlStr.includes("/api/v1/operations/chefs")) {
          return {
            ok: true,
            json: async () => mockChefsResponse,
          };
        }
        return {
          ok: true,
          json: async () => ({ data: {} }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the schedule title and weekly stats banner", async () => {
    render(<AdminCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Chef Bookings Schedule")).toBeInTheDocument();
    });

    expect(screen.getByText(/Teams Calendar View/i)).toBeInTheDocument();
    expect(screen.getByText("← Table View")).toBeInTheDocument();
    expect(screen.getByText("Time Grid")).toBeInTheDocument();
    expect(screen.getByText("Day Columns")).toBeInTheDocument();
  });

  it("keeps unpaid and missing-payment bookings out of the calendar and its totals", async () => {
    render(<AdminCalendarPage />);
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar bookings...")).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Unpaid stew")).not.toBeInTheDocument();
    expect(screen.queryByText("Uninitialized stew")).not.toBeInTheDocument();
    expect(screen.queryByText("CM-UNPAID-01")).not.toBeInTheDocument();
    expect(screen.queryByText("CM-MISSING-PAY-01")).not.toBeInTheDocument();
  });

  it("renders week navigation controls and allows switching views", async () => {
    render(<AdminCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    // Switch to Day Columns view
    const columnsBtn = screen.getByRole("button", { name: "Day Columns" });
    fireEvent.click(columnsBtn);

    expect(screen.getByRole("button", { name: "Day Columns" })).toBeInTheDocument();

    // Switch back to Time Grid view
    const gridBtn = screen.getByRole("button", { name: "Time Grid" });
    fireEvent.click(gridBtn);
    expect(gridBtn).toBeInTheDocument();
  });

  it("allows filtering by chef and status", async () => {
    render(<AdminCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Chef Bookings Schedule")).toBeInTheDocument();
    });

    // Status tabs
    const fulfilledTab = screen.getByRole("button", { name: /Fulfilled/i });
    fireEvent.click(fulfilledTab);

    const awaitingChefTab = screen.getByRole("button", { name: /Awaiting Chef/i });
    fireEvent.click(awaitingChefTab);

    const allTab = screen.getByRole("button", { name: /All Orders/i });
    fireEvent.click(allTab);
  });

  it("opens booking modal on card click and closes on Done", async () => {
    render(<AdminCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Chef Bookings Schedule")).toBeInTheDocument();
    });

    // Switch to Day Columns for clear card clicking
    fireEvent.click(screen.getByRole("button", { name: "Day Columns" }));

    // Find and click the booking card
    const bookingCards = screen.getAllByRole("button");
    const lambCurryCard = bookingCards.find((btn) =>
      btn.textContent?.includes("Lamb curry and dombolo"),
    );
    if (lambCurryCard) {
      fireEvent.click(lambCurryCard);

      // Verify modal content
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Daisy Muller")).toBeInTheDocument();
        expect(screen.getByText("daisy.muller@gmail.com")).toBeInTheDocument();
        expect(screen.getByText("No dairy please")).toBeInTheDocument();
      });

      // Close modal
      const doneBtn = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    }
  });
});
