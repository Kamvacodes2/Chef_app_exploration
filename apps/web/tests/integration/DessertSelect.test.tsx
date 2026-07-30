import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DessertSelect } from "@/features/order-flow/components/DessertSelect";
import { DESSERTS } from "@/features/order-flow/constants/menu";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

function createController(): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE, step: "dessert" },
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
}

describe("DessertSelect", () => {
  it("keeps dessert choices as image-free, clickable cards", () => {
    const controller = createController();
    const { container } = render(
      <OrderContext.Provider value={controller}>
        <DessertSelect />
      </OrderContext.Provider>,
    );

    expect(container.querySelectorAll("img")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Malva Pudding/ }));
    expect(controller.selectDessert).toHaveBeenCalledWith(DESSERTS[0]);
  });
  it("shows the fixed dessert price and supports skipping dessert", () => {
    const controller = createController();
    render(
      <OrderContext.Provider value={controller}>
        <DessertSelect />
      </OrderContext.Provider>,
    );

    expect(screen.getByText(/adds R90/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /No dessert/i }));
    expect(controller.skipDessert).toHaveBeenCalledTimes(1);
  });
});
