import { useReducer } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GiftCodeForm } from "@/features/order-flow/components/GiftCodeForm";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import {
  INITIAL_ORDER_STATE,
  orderReducer,
  selectDiscount,
  selectTotal,
} from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";
import { MAINS } from "@/features/order-flow/constants/menu";

const main = MAINS.find((item) => item.id === "chicken-peri-peri")!;

/** Minimal live harness: wires GiftCodeForm to the real reducer so UI-level
 * dispatch sequencing (SET_GIFT_INPUT -> APPLY_GIFT / REMOVE_GIFT) is exercised
 * exactly as a real customer would trigger it. */
function Harness(): React.ReactElement {
  const [state, dispatch] = useReducer(orderReducer, {
    ...INITIAL_ORDER_STATE,
    main,
  });

  const controller: OrderController = {
    state,
    subtotal: 0,
    discount: selectDiscount(state),
    total: selectTotal(state),
    canContinue: true,
    stepIndex: 0,
    isSubmittingRequest: false,
    submissionError: null,
    bookingConfirmation: null,
    selectGoal: () => {},
    startMealDiscovery: () => {},
    startPlanSetup: () => {},
    togglePreferredDay: () => {},
    decidePlanDays: () => {},
    selectPlanFavorite: () => {},
    setPlanFavoriteLink: () => {},
    setPlanSecondFavoriteLink: () => {},
    clearPlanFavoriteLink: () => {},
    clearPlanSecondFavoriteLink: () => {},
    selectPlanSecondFavorite: () => {},
    decidePlanFavorite: () => {},
    selectMain: () => {},
    preselectMain: () => {},
    toggleSide: () => {},
    selectDessert: () => {},
    skipDessert: () => {},
    setCustomRequest: () => {},
    clearCustomRequest: () => {},
    setBreakfastAddOn: () => {},
    setDate: () => {},
    setTime: () => {},
    setAddressField: () => {},
    setContactField: () => {},
    setGiftInput: (value) => dispatch({ type: "SET_GIFT_INPUT", value }),
    applyGift: () => dispatch({ type: "APPLY_GIFT" }),
    applyPromoCode: (code: string) => dispatch({ type: "APPLY_PROMO_CODE", code }),
    removeGift: () => dispatch({ type: "REMOVE_GIFT" }),
    next: () => {},
    back: () => {},
    goTo: () => {},
    confirm: async () => {},
    reset: () => {},
  };

  return (
    <OrderContext.Provider value={controller}>
      <GiftCodeForm />
      <p data-testid="total">{selectTotal(state)}</p>
    </OrderContext.Provider>
  );
}

describe("GiftCodeForm", () => {
  it("labels the discount code input for accessibility", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Discount code")).toBeInTheDocument();
  });

  it("applies a valid code and reflects it in the displayed total", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const beforeTotal = screen.getByTestId("total").textContent;

    await user.type(screen.getByLabelText("Discount code"), "CHILL10");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("status")).toHaveTextContent("10% off applied");
    expect(screen.getByText(/CHILL10/)).toBeInTheDocument();
    expect(screen.getByTestId("total").textContent).not.toBe(beforeTotal);
  });

  it("submits on Enter without clicking Apply", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Discount code"), "WINTER15{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("15% winter warmer discount applied");
  });

  it("shows an error message for an invalid code and leaves the total unchanged", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const beforeTotal = screen.getByTestId("total").textContent;

    await user.type(screen.getByLabelText("Discount code"), "NOPE{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("doesn't look right");
    expect(screen.getByTestId("total").textContent).toBe(beforeTotal);
  });

  it("allows removing an applied code, returning to the input", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Discount code"), "FIRSTMEAL{Enter}");
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByLabelText("Discount code")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
