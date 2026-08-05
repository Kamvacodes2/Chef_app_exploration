import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddressForm } from "@/features/order-flow/components/AddressForm";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

function createController(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE, step: "address" },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: false,
    stepIndex: 5,
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
}

function renderAddressForm(overrides: Partial<OrderController> = {}): OrderController {
  const controller = createController(overrides);
  render(
    <OrderContext.Provider value={controller}>
      <AddressForm />
    </OrderContext.Provider>,
  );
  return controller;
}

describe("AddressForm", () => {
  it("uses the signed-in account contact and asks only for the visit address", () => {
    const controller = renderAddressForm({
      authenticatedUser: {
        id: "customer-1",
        email: "sam@example.test",
        displayName: "Sam",
        roles: ["CUSTOMER"],
        status: "ACTIVE",
        emailVerifiedAt: null,
        createdAt: "2026-07-26T10:00:00.000Z",
      },
      isSessionLoading: false,
    });

    expect(screen.getByRole("heading", { name: "Where should we come?" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /full name/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /email address/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /mobile number/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /area/i }), {
      target: { value: "Fourways" },
    });
    expect(controller.setAddressField).toHaveBeenCalledWith("area", "Fourways");
  });

  it("keeps contact fields required for a guest booking", () => {
    renderAddressForm({ authenticatedUser: null, isSessionLoading: false });

    expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /full name/i })).toBeRequired();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeRequired();
    expect(screen.getByRole("textbox", { name: /mobile number/i })).toBeRequired();
  });
});
