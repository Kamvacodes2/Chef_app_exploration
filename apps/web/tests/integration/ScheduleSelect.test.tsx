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
    decidePlanFavorite: vi.fn(),
    selectMain: vi.fn(),
    preselectMain: vi.fn(),
    toggleSide: vi.fn(),
    selectDessert: vi.fn(),
    skipDessert: vi.fn(),
    setCustomRequest: vi.fn(),
    clearCustomRequest: vi.fn(),
    setDate: vi.fn(),
    setTime: vi.fn(),
    setAddressField: vi.fn(),
    setContactField: vi.fn(),
    setGiftInput: vi.fn(),
    applyGift: vi.fn(),
    removeGift: vi.fn(),
    next: vi.fn(),
    back: vi.fn(),
    goTo: vi.fn(),
    confirm: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };

  render(
    <OrderContext.Provider value={controller}>
      <ScheduleSelect />
    </OrderContext.Provider>,
  );

  return controller;
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
      expect(screen.getByRole("button", { name: "14" })).toBeDisabled();
      const fifteenth = screen.getByRole("button", { name: "15" });
      expect(fifteenth).not.toBeDisabled();

      fireEvent.click(fifteenth);
      expect(setDate).toHaveBeenCalledWith("2026-08-15");
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables passed same-day slots while leaving later slots selectable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T13:19:00.000Z"));

    try {
      renderSchedule({ state: { ...INITIAL_ORDER_STATE, step: "schedule", date: "2026-08-15" } });

      fireEvent.click(screen.getByRole("button", { name: /afternoon/i }));

      expect(screen.getByRole("button", { name: "15:00" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "16:00" })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
