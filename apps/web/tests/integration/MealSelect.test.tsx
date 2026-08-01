import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealSelect } from "@/features/order-flow/components/MealSelect";
import { MAINS } from "@/features/order-flow/constants/menu";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

function createController(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE, step: "meal" },
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
    ...overrides,
  };
}

function renderMealSelect(overrides: Partial<OrderController> = {}): OrderController {
  const controller = createController(overrides);
  render(
    <OrderContext.Provider value={controller}>
      <MealSelect />
    </OrderContext.Provider>,
  );
  return controller;
}

describe("MealSelect", () => {
  it("filters meals through every category branch", () => {
    renderMealSelect();

    const categoryCases = [
      ["In demand", "Oxtail Stew"],
      ["Healthy", "Chicken Gyro Bowl"],
      ["Chicken", "Peri-Peri Chicken"],
      ["Beef & meat", "Steak & Chips"],
      ["Pasta & family", "Beef Lasagne"],
      ["Sunday colours", "Chicken Seven Colours"],
      ["All meals", "Overnight Oats"],
    ] as const;

    for (const [category, expectedMeal] of categoryCases) {
      fireEvent.click(screen.getByRole("button", { name: category }));
      expect(screen.getByRole("button", { name: category })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getAllByText(expectedMeal, { exact: true }).length).toBeGreaterThan(0);
    }
  });

  it("searches meal details and shows the no-match fallback", () => {
    renderMealSelect();
    const search = screen.getByPlaceholderText("Search meals, ingredients or cravings");

    fireEvent.change(search, { target: { value: "tzatziki" } });
    expect(screen.getByRole("button", { name: /Chicken Gyro Bowl/ })).toBeInTheDocument();
    expect(screen.queryByText("Ingredients:")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "not-on-the-menu-yet" } });
    expect(screen.getByText("No exact match yet.")).toBeInTheDocument();
  });

  it("dispatches menu selections and highlights the selected main", () => {
    const selectedMeal = MAINS.find((meal) => meal.id === "chicken-peri-peri")!;
    const controller = renderMealSelect({
      state: { ...INITIAL_ORDER_STATE, step: "meal", main: selectedMeal },
    });

    expect(screen.getByText("Selected: Peri-Peri Chicken")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /BBQ Chicken/ }));

    expect(controller.selectMain).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chicken-bbq" }),
    );
  });

  it("submits and clears custom meal requests", () => {
    const controller = renderMealSelect();

    fireEvent.click(screen.getByRole("button", { name: "Can't find what you want?" }));
    expect(screen.getByRole("button", { name: "Request this" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Tell the kitchen what you're craving"), {
      target: { value: "Ouma's chicken curry" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request this" }));
    expect(controller.setCustomRequest).toHaveBeenCalledWith("Ouma's chicken curry");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(controller.clearCustomRequest).toHaveBeenCalledTimes(1);
  });
});
