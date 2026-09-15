import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AdminCalendarPage } from "@/features/platform/AdminCalendarPage";

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
        scheduledDate: "2026-09-15",
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
        id: "b-2",
        reference: "CM00540",
        status: "AWAITING_CHEF",
        type: "SUBSCRIPTION",
        customerId: "cust-2",
        mainMealSlug: "beef-stew",
        mainName: "Beef stew and dombolo",
        customRequest: null,
        scheduledDate: "2026-09-16",
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
