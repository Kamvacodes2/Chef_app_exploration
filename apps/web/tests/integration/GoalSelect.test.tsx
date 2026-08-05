import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalSelect } from "@/features/order-flow/components/GoalSelect";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

function renderGoalSelect(): OrderController {
  const controller: OrderController = {
    state: { ...INITIAL_ORDER_STATE, step: "goal" },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: false,
    stepIndex: 0,
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
  };

  render(
    <OrderContext.Provider value={controller}>
      <GoalSelect />
    </OrderContext.Provider>,
  );

  return controller;
}

describe("GoalSelect", () => {
  it("uses paired controls above a hidden-overflow goal rail", () => {
    renderGoalSelect();

    const track = screen.getByTestId("goal-tile-track");
    expect(track).toHaveClass("overflow-hidden");
    expect(track).not.toHaveClass("overflow-x-auto");
    expect(screen.queryByRole("button", { name: "Scroll goals" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous goal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next goal" })).toBeEnabled();
  });

  it("moves through the complete goal rail and back without exposing a browser scrollbar", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    renderGoalSelect();

    const next = screen.getByRole("button", { name: "Next goal" });
    for (let index = 1; index <= 5; index += 1) {
      fireEvent.click(next);
      expect(screen.getByTestId("goal-tile-track")).toHaveAttribute(
        "data-active-goal-index",
        String(index),
      );
    }

    expect(next).toBeDisabled();
    const previous = screen.getByRole("button", { name: "Previous goal" });
    expect(previous).toBeEnabled();

    fireEvent.click(previous);
    expect(screen.getByTestId("goal-tile-track")).toHaveAttribute("data-active-goal-index", "4");
    expect(scrollTo).toHaveBeenCalled();
  });
});
