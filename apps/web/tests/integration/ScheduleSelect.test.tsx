import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduleSelect } from "@/features/order-flow/components/ScheduleSelect";
import {
  businessDateToISODate,
  getJohannesburgBusinessDate,
} from "@/features/order-flow/components/scheduleBusinessDate";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

function renderSchedule(overrides: Partial<OrderController> = {}) {
  const controller: OrderController = {
    state: { ...INITIAL_ORDER_STATE, step: "schedule" },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: false,
    stepIndex: 4,
    isSubmittingRequest: false,
    submissionError: null,
    bookingConfirmation: null,
    selectGoal: vi.fn(),
    startMealDiscovery: vi.fn(),
    startPlanSetup: vi.fn(),
    togglePreferredDay: vi.fn(),
    decidePlanDays: vi.fn(),
    selectPlanFavorite: vi.fn(),
    setPlanFavoriteLink: () => {},
    setPlanSecondFavoriteLink: () => {},
    clearPlanFavoriteLink: () => {},
    clearPlanSecondFavoriteLink: () => {},
    selectPlanSecondFavorite: vi.fn(),
    togglePlanExtraMeal: vi.fn(),
    setPlanExtraMealLink: vi.fn(),
    removePlanExtraMealLink: vi.fn(),
    assignDayMeal: vi.fn(),
    decideDayMeals: vi.fn(),
    decidePlanFavorite: vi.fn(),
    selectMain: vi.fn(),
    preselectMain: vi.fn(),
    toggleSide: vi.fn(),
    selectDessert: vi.fn(),
    skipDessert: vi.fn(),
    setCustomRequest: vi.fn(),
    clearCustomRequest: vi.fn(),
    setBreakfastAddOn: vi.fn(),
    setDate: vi.fn(),
    setTime: vi.fn(),
    setAddressField: vi.fn(),
    setContactField: vi.fn(),
    setGiftInput: vi.fn(),
    applyGift: vi.fn(),
    applyPromoCode: vi.fn(),
    removeGift: vi.fn(),
    next: vi.fn(),
    back: vi.fn(),
    goTo: vi.fn(),
    confirm: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };

  const renderResult = render(
    <OrderContext.Provider value={controller}>
      <ScheduleSelect />
    </OrderContext.Provider>,
  );

  return { ...renderResult, controller };
}

describe("ScheduleSelect", () => {
  it("uses a themed calendar to choose future dates outside the current month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T10:00:00.000Z"));

    try {
      const setDate = vi.fn();
      renderSchedule({ setDate });

      fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));
      fireEvent.click(screen.getByRole("button", { name: "Next month" }));
      fireEvent.click(screen.getByRole("button", { name: "15" }));

      expect(setDate).toHaveBeenCalledWith("2026-09-15");
      expect(screen.queryByRole("button", { name: "15" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts time selection with day parts, then expands the chosen period", () => {
    const setTime = vi.fn();
    renderSchedule({ setTime });

    expect(screen.getByRole("button", { name: /morning/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /afternoon/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /evening/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "07:00" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /morning/i }));
    expect(screen.getByRole("button", { name: "07:00" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "07:00" }));
    expect(setTime).toHaveBeenCalledWith("07:00");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: /afternoon/i }));

    ["12:00", "14:00", "16:00"].forEach((time) => {
      expect(screen.getByRole("button", { name: time })).toBeInTheDocument();
    });
  });

  it("uses Johannesburg business date when UTC day is still previous day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T22:30:00.000Z"));

    try {
      const setDate = vi.fn();
      expect(businessDateToISODate(getJohannesburgBusinessDate())).toBe("2026-08-15");
      renderSchedule({ setDate });

      fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));

      expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
      // 24h lead time at 00:30 JHB Aug 15: Aug 15 entirely inside the window;
      // Aug 16 07:00 JHB is 30.5h away -> bookable.
      expect(screen.getByRole("button", { name: "15" })).toBeDisabled();
      const sixteenth = screen.getByRole("button", { name: "16" });
      expect(sixteenth).not.toBeDisabled();

      fireEvent.click(sixteenth);
      expect(setDate).toHaveBeenCalledWith("2026-08-16");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the earliest bookable day as tomorrow when before 12:00 PM, and advances to day-after when past 12:00 PM", () => {
    vi.useFakeTimers();

    // 1) Saturday 10:30 AM JHB (08:30 UTC) -> Before 12:00 PM cutoff, Aug 16 (tomorrow) is bookable.
    vi.setSystemTime(new Date("2026-08-15T08:30:00.000Z"));
    try {
      const { unmount } = renderSchedule({});
      expect(screen.getByText(/at least 24 hours of lead time/i)).toBeInTheDocument();
      expect(screen.getByText(/earliest day you can book is/i)).toBeInTheDocument();
      expect(screen.getByText("16 August 2026")).toBeInTheDocument();
      unmount();
    } finally {
      vi.useRealTimers();
    }

    // 2) Saturday 12:30 PM JHB (10:30 UTC) -> Past 12:00 PM cutoff, Aug 16 is NOT bookable, advances to Aug 17.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T10:30:00.000Z"));
    try {
      renderSchedule({});
      expect(screen.getByText(/at least 24 hours of lead time/i)).toBeInTheDocument();
      expect(screen.getByText(/earliest day you can book is/i)).toBeInTheDocument();
      expect(screen.getByText("17 August 2026")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables next-day slots entirely when ordered after 12:00 PM, but enables future day slots", () => {
    vi.useFakeTimers();
    // Saturday at 14:00 Johannesburg (12:00 UTC)
    vi.setSystemTime(new Date("2026-08-15T12:00:00.000Z"));

    try {
      // 1) Attempting to view Sunday (next day) 2026-08-16
      const { unmount } = renderSchedule({
        state: { ...INITIAL_ORDER_STATE, step: "schedule", date: "2026-08-16" },
      });

      // All time period buttons (Morning, Afternoon, Evening) must be disabled because Saturday 14:00 is past the 12:00 PM cutoff
      expect(screen.getByRole("button", { name: /morning/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /afternoon/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /evening/i })).toBeDisabled();
      unmount();

      // 2) Viewing Monday (day after tomorrow) 2026-08-17
      renderSchedule({
        state: { ...INITIAL_ORDER_STATE, step: "schedule", date: "2026-08-17" },
      });
      const eveningButton = screen.getByRole("button", { name: /evening/i });
      expect(eveningButton).not.toBeDisabled();
      fireEvent.click(eveningButton);
      // Monday 17:00 is > 24 hours away and not next-day cutoff -> enabled
      expect(screen.getByRole("button", { name: "17:00" })).not.toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("enables next-day slots that satisfy 24h lead time when ordered before 12:00 PM", () => {
    vi.useFakeTimers();
    // Saturday at 10:00 AM Johannesburg (08:00 UTC)
    vi.setSystemTime(new Date("2026-08-15T08:00:00.000Z"));

    try {
      renderSchedule({
        state: { ...INITIAL_ORDER_STATE, step: "schedule", date: "2026-08-16" },
      });

      // Evening (17:00) is 31 hours away and ordered before 12:00 PM -> enabled
      const eveningButton = screen.getByRole("button", { name: /evening/i });
      expect(eveningButton).not.toBeDisabled();
      fireEvent.click(eveningButton);
      expect(screen.getByRole("button", { name: "17:00" })).not.toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
