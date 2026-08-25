import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ReviewStep } from "@/features/order-flow/components/ReviewStep";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { MAINS, SIDES, DESSERTS } from "@/features/order-flow/constants/menu";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

/**
 * The main dish's catalog price must never be shown to the customer as a
 * charge — a customer without a subscription always pays a flat session
 * price regardless of which main dish they choose. Sides/desserts still
 * carry their own real fee (or "Included" for a $0 item).
 */

const main = MAINS.find((item) => item.id === "chicken-peri-peri")!;
const side = SIDES.find((s) => s.id === "side-coleslaw")!;
const dessert = DESSERTS.find((d) => d.id === "dessert-malva")!;

function controller(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: {
      ...INITIAL_ORDER_STATE,
      main,
      sides: [side],
      dessert,
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
    pricingQuote: {
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 18000,
      items: [
        { slug: main.id, priceCents: 16900 },
        { slug: side.id, priceCents: 5500 },
        { slug: dessert.id, priceCents: 0 },
      ],
    },
    isPricingLoading: false,
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
    confirm: vi.fn(async () => {}),
    reset: vi.fn(),
    ...overrides,
  } as OrderController;
}

function renderWith(value: OrderController): ReactElement {
  render(
    <OrderContext.Provider value={value}>
      <ReviewStep />
    </OrderContext.Provider>,
  );
  return <></>;
}

describe("ReviewStep — main dish never shows an individual price", () => {
  it("shows a neutral 'Included in your session' label for the main dish instead of its catalog price", () => {
    renderWith(controller());

    // The catalog price (R169) must never render as a charge next to the main dish.
    expect(screen.queryByText(/R\s?169/)).not.toBeInTheDocument();
    expect(screen.queryByText(/169[.,]00/)).not.toBeInTheDocument();
    expect(screen.getByText("Included in your session")).toBeInTheDocument();
  });

  it("still shows the side's real fee and the dessert's Included label unchanged", () => {
    renderWith(controller());

    expect(screen.getByText(/R\s?55|55[.,]00/)).toBeInTheDocument();
    // Both the main (neutral copy) and the free dessert use "Included" wording,
    // but only one "Included" (bare) label should exist — the dessert's.
    expect(screen.getByText("Included")).toBeInTheDocument();
  });

  it("uses local estimated prices while the server quote is unavailable", () => {
    renderWith(
      controller({
        pricingQuote: null,
        subtotal: 617.85,
        discount: 0,
        total: 617.85,
      }),
    );

    expect(screen.queryByText("--")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.getByText("Estimated order total")).toBeInTheDocument();
    expect(screen.getByText("Estimated items")).toBeInTheDocument();
    expect(
      screen.getByText(/Checkout will unlock once the confirmed quote is ready/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/617[,.]85/)).toHaveLength(2);
    expect(screen.getByText(/R\s?90|90[.,]00/)).toBeInTheDocument();
  });

  it("does not mix local item prices into an incomplete server quote", () => {
    renderWith(
      controller({
        pricingQuote: {
          subtotalCents: 18000,
          discountCents: 0,
          totalCents: 18000,
          items: [
            { kind: "main", slug: main.id, name: main.name, priceCents: 0, sortOrder: 0 },
            { kind: "dessert", slug: dessert.id, name: dessert.name, priceCents: 0, sortOrder: 2 },
          ],
        },
      }),
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText(/R\s?55|55[.,]00/)).not.toBeInTheDocument();
  });

  it("uses plan-request wording for estimated recurring package prices", () => {
    const base = controller();

    renderWith(
      controller({
        state: { ...base.state, planId: "family", planScheduleDeferred: true },
        pricingQuote: null,
        subtotal: 3799,
        discount: 0,
        total: 3799,
      }),
    );

    expect(screen.getByText("Estimated monthly plan")).toBeInTheDocument();
    expect(
      screen.getByText(/send the plan request once the confirmed quote is ready/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Checkout will unlock/)).not.toBeInTheDocument();
  });
});
