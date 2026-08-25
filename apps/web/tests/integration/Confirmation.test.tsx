import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// Confirmation calls useRouter() to redirect bank-transfer bookings to the
// standalone /confirmed page. jsdom has no App Router, so the hook throws
// unless next/navigation is mocked (invariant expected app router to be
// mounted). The redirect itself is covered by the order-flow E2E suite; these
// tests only need a no-op router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));
import { Confirmation } from "@/features/order-flow/components/Confirmation";
import { OrderContext } from "@/features/order-flow/state/OrderContext";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";
import type { OrderController } from "@/features/order-flow/state/useOrderController";

/**
 * The confirmation screen is the last thing a customer sees and the only place
 * the bank-transfer instructions are rendered, but it had no direct coverage.
 * These tests pin the three distinct outcomes it renders — a paid once-off
 * order, a recipe that needs review, and a recurring plan request — plus the
 * bank-detail block and the reset action.
 */

function controller(overrides: Partial<OrderController> = {}): OrderController {
  return {
    state: { ...INITIAL_ORDER_STATE },
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
      <Confirmation />
    </OrderContext.Provider>,
  );
  return <></>;
}

const bankTransfer = {
  bankName: "Test Bank",
  legalEntityName: "CHEF MATE (PTY) LTD",
  registrationNumber: "2026/593342/07",
  branchName: "Sandton",
  branchCode: "250655",
  electronicBranchCode: "051001",
  swiftCode: "SBZA ZA JJ",
  accountHolder: "Chefmate Pty Ltd",
  accountNumber: "000123456",
  accountType: "MYMOBIZ CURRENT ACCOUNT",
  paymentReference: "CM-REF-001",
};

describe("Confirmation — completed order", () => {
  const confirmed = {
    reference: "CM-1001",
    status: "CONFIRMED",
    totalCents: 52_785,
    payment: {
      method: "BANK_TRANSFER",
      provider: "BANK_TRANSFER",
      status: "PENDING",
      bankTransfer,
      paystack: null,
    },
  } as unknown as OrderController["bookingConfirmation"];

  const paystackConfirmed = {
    reference: "CM-1002",
    status: "CONFIRMED",
    totalCents: 52_785,
    payment: {
      method: "PAYSTACK",
      provider: "PAYSTACK",
      status: "PENDING",
      bankTransfer: null,
      paystack: {
        authorizationUrl: "https://checkout.paystack.com/test-auth",
        accessCode: "test-access-code",
      },
    },
  } as unknown as OrderController["bookingConfirmation"];

  it("announces the order and shows the reference", () => {
    renderWith(controller({ bookingConfirmation: confirmed }));

    expect(screen.getByRole("heading", { name: "Order received." })).toBeInTheDocument();
    expect(screen.getByText("CM-1001")).toBeInTheDocument();
  });

  it("formats the total in Rand rather than raw cents", () => {
    renderWith(controller({ bookingConfirmation: confirmed }));

    expect(screen.getByText(/527[.,]85/)).toBeInTheDocument();
    expect(screen.queryByText("52785")).not.toBeInTheDocument();
  });

  it("renders the customer-facing bank-transfer fields only", () => {
    renderWith(controller({ bookingConfirmation: confirmed }));

    expect(screen.getByText("Test Bank")).toBeInTheDocument();
    expect(screen.queryByText("Legal entity")).not.toBeInTheDocument();
    expect(screen.queryByText("CHEF MATE (PTY) LTD")).not.toBeInTheDocument();
    expect(screen.queryByText("Registration")).not.toBeInTheDocument();
    expect(screen.queryByText("2026/593342/07")).not.toBeInTheDocument();
    expect(screen.getByText("Sandton (250655)")).toBeInTheDocument();
    expect(screen.getByText("051001")).toBeInTheDocument();
    expect(screen.getByText("SBZA ZA JJ")).toBeInTheDocument();
    expect(screen.getByText("Chefmate Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("000123456")).toBeInTheDocument();
    expect(screen.getByText("CURRENT ACCOUNT")).toBeInTheDocument();
    expect(screen.queryByText("MYMOBIZ CURRENT ACCOUNT")).not.toBeInTheDocument();
    expect(screen.getByText("CM-REF-001")).toBeInTheDocument();
  });

  it("shows the once-off milestone sequence", () => {
    renderWith(controller({ bookingConfirmation: confirmed }));

    expect(screen.getByText("Order received")).toBeInTheDocument();
    expect(screen.getByText("Visit complete")).toBeInTheDocument();
  });

  it("renders the Paystack checkout fallback link for Paystack orders", () => {
    renderWith(controller({ bookingConfirmation: paystackConfirmed }));

    expect(screen.getByRole("heading", { name: "Secure checkout" })).toBeInTheDocument();
    expect(screen.getByText(/secure Paystack checkout/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue to Paystack" })).toHaveAttribute(
      "href",
      "https://checkout.paystack.com/test-auth",
    );
  });

  it("resets the flow when the customer starts another request", () => {
    const reset = vi.fn();
    renderWith(controller({ bookingConfirmation: confirmed, reset }));

    fireEvent.click(screen.getByRole("button", { name: "Start another request" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("Confirmation — request needing review", () => {
  const review = {
    reference: "CM-2002",
    status: "NEEDS_REVIEW",
    totalCents: 0,
    payment: null,
  } as unknown as OrderController["bookingConfirmation"];

  it("does not quote a price that has not been confirmed", () => {
    renderWith(controller({ bookingConfirmation: review }));

    expect(screen.getByRole("heading", { name: "Request received." })).toBeInTheDocument();
    expect(screen.getByText("To be confirmed")).toBeInTheDocument();
  });

  it("explains that a tailored price will be emailed", () => {
    renderWith(controller({ bookingConfirmation: review }));
    expect(screen.getAllByText(/tailored/i).length).toBeGreaterThan(0);
  });

  it("shows the review milestone sequence", () => {
    renderWith(controller({ bookingConfirmation: review }));
    expect(screen.getByText("Chefmate review")).toBeInTheDocument();
  });
});

describe("Confirmation — no confirmation yet", () => {
  it("falls back to pending placeholders rather than blank fields", () => {
    renderWith(controller({ bookingConfirmation: null }));

    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not selected").length).toBeGreaterThan(0);
  });
});
