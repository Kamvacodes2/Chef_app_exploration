import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAINS } from "@/features/order-flow/constants/menu";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

const controllerStore = vi.hoisted(() => ({ current: null as OrderController | null }));

vi.mock("@/features/order-flow/state/useOrderController", () => ({
  useOrderController: () => {
    if (!controllerStore.current) throw new Error("missing test controller");
    return controllerStore.current;
  },
}));

vi.mock("@/features/hero/hooks/useMediaQuery", () => ({
  usePrefersReducedMotion: () => true,
}));

import { OrderFlow } from "@/features/order-flow/OrderFlow";

const main = MAINS.find((item) => item.id === "chicken-peri-peri")!;

function controller(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: {
      ...INITIAL_ORDER_STATE,
      step: "review",
      main,
      date: "2026-08-15",
      time: "18:30",
      address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
    },
    subtotal: 0,
    discount: 0,
    total: 0,
    canContinue: true,
    stepIndex: 6,
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
    ...overrides,
  };
}

describe("OrderFlow submit state", () => {
  it("shows a compact visible error when submission fails", () => {
    controllerStore.current = controller({
      submissionError: "We couldn't send this request. Please try again.",
    });

    render(<OrderFlow />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't send this request. Please try again.",
    );
  });

  it("waits for a current server quote before enabling Checkout", () => {
    controllerStore.current = controller({ pricingQuote: null, isPricingLoading: false });

    render(<OrderFlow />);

    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
  });

  it("enables Checkout after a current server quote arrives", () => {
    controllerStore.current = controller({
      pricingQuote: {
        subtotalCents: 18000,
        discountCents: 0,
        totalCents: 18000,
        items: [],
      },
      isPricingLoading: false,
    });

    render(<OrderFlow />);

    expect(screen.getByRole("button", { name: "Checkout" })).toBeEnabled();
  });
  it("disables Checkout while submission is in progress", () => {
    controllerStore.current = controller({ isSubmittingRequest: true });

    render(<OrderFlow />);

    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
  });
  it("uses a plan request action for recurring packages until session entitlements are activated", () => {
    controllerStore.current = controller({
      state: {
        ...INITIAL_ORDER_STATE,
        step: "review",
        planId: "family",
        main,
        date: "2026-08-15",
        time: "18:30",
        address: { estate: "Dainfern", unit: "", street: "12 Jacaranda Ave", area: "Fourways" },
      },
      pricingQuote: {
        subtotalCents: 379900,
        discountCents: 0,
        totalCents: 379900,
        items: [],
        plan: {
          id: "family",
          name: "chefmate family",
          sessions: "8 sessions",
          recurring: true,
          priceCents: 379900,
        },
      },
      isPricingLoading: false,
    });

    render(<OrderFlow />);

    expect(screen.getByRole("button", { name: "Send plan request" })).toBeEnabled();
    expect(screen.getByText(/confirm your recurring session schedule/i)).toBeInTheDocument();
  });
});
