import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidesSelect } from "@/features/order-flow/components/SidesSelect";
import { SIDES } from "@/features/order-flow/constants/menu";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

function createController(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE, step: "sides" },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: true,
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
    setPlanFavoriteLink: () => {},
    setPlanSecondFavoriteLink: () => {},
    clearPlanFavoriteLink: () => {},
    clearPlanSecondFavoriteLink: () => {},
    selectPlanSecondFavorite: vi.fn(),
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
    applyPromoCode: vi.fn(),
    removeGift: vi.fn(),
    next: vi.fn(),
    back: vi.fn(),
    goTo: vi.fn(),
    confirm: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderSidesSelect(overrides: Partial<OrderController> = {}): OrderController {
  const controller = createController(overrides);
  render(
    <OrderContext.Provider value={controller}>
      <SidesSelect />
    </OrderContext.Provider>,
  );
  return controller;
}

describe("SidesSelect", () => {
  it("explains the two-included-side rule and dispatches selected sides", () => {
    const controller = renderSidesSelect();

    expect(screen.getByText(/Any extra side adds R55/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Coleslaw/i }));
    expect(controller.toggleSide).toHaveBeenCalledWith(SIDES[1]);
  });

  it("summarizes selected sides when the customer adds a paid extra", () => {
    renderSidesSelect({
      state: { ...INITIAL_ORDER_STATE, step: "sides", sides: SIDES.slice(0, 3) },
    });

    expect(screen.getByText("2 included, 1 extra at R55 each")).toBeInTheDocument();
  });
});
