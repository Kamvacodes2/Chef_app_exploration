import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanFirstSessionSelect } from "@/features/order-flow/components/PlanFirstSessionSelect";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

vi.mock("@/features/order-flow/components/ScheduleSelect", () => ({
  ScheduleSelect: () => <div data-testid="themed-schedule-select">Themed schedule</div>,
}));

function controller(): OrderController {
  return {
    state: {
      ...INITIAL_ORDER_STATE,
      step: "plan-first-session",
      planId: "family",
      preferredDays: ["monday", "thursday"],
      firstSessionDate: "2026-09-10",
      date: "2026-09-10",
      time: "18:00",
    },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: true,
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
    selectPlanSecondFavorite: vi.fn(),
    togglePlanExtraMeal: vi.fn(),
    setPlanExtraMealLink: vi.fn(),
    removePlanExtraMealLink: vi.fn(),
    assignDayMeal: vi.fn(),
    decideDayMeals: vi.fn(),
    decidePlanFavorite: vi.fn(),
    setPlanFavoriteLink: vi.fn(),
    setPlanSecondFavoriteLink: vi.fn(),
    clearPlanFavoriteLink: vi.fn(),
    clearPlanSecondFavoriteLink: vi.fn(),
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
    confirm: vi.fn(async () => {}),
    reset: vi.fn(),
  };
}

describe("PlanFirstSessionSelect", () => {
  it("makes both first-session choices selectable", () => {
    render(
      <OrderContext.Provider value={controller()}>
        <PlanFirstSessionSelect />
      </OrderContext.Provider>,
    );

    const later = screen.getByRole("button", { name: /Yes, order this first session/i });
    const now = screen.getByRole("button", { name: /I'll edit it now/i });

    expect(later).toHaveAttribute("aria-pressed", "true");
    expect(now).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(now);

    expect(now).toHaveAttribute("aria-pressed", "true");
    expect(later).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("themed-schedule-select")).toBeInTheDocument();
  });
});
