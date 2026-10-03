import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionsPage } from "@/features/subscriptions/SubscriptionsPage";
import {
  formatSubscriptionAmount,
  type CustomerSubscription,
} from "@/features/subscriptions/api/subscriptionsClient";

const api = vi.hoisted(() => ({
  fetchCustomerSubscriptions: vi.fn(),
  fetchSubscriptionManageLink: vi.fn(),
  cancelCustomerSubscription: vi.fn(),
  formatSubscriptionAmount: vi.fn(),
  formatSubscriptionDate: vi.fn(),
}));

// The real formatters are behaviour the page depends on (amounts in Rand, dates
// in SAST), so they are exercised rather than stubbed.
vi.mock("@/features/subscriptions/api/subscriptionsClient", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/subscriptions/api/subscriptionsClient")
  >("@/features/subscriptions/api/subscriptionsClient");
  return {
    ...actual,
    fetchCustomerSubscriptions: api.fetchCustomerSubscriptions,
    fetchSubscriptionManageLink: api.fetchSubscriptionManageLink,
    cancelCustomerSubscription: api.cancelCustomerSubscription,
  };
});

function subscription(overrides: Partial<CustomerSubscription> = {}): CustomerSubscription {
  return {
    paystackSubscriptionCode: "SUB_1",
    planId: "rhythm",
    status: "ACTIVE",
    currency: "ZAR",
    amountCents: 199900,
    cardBrand: "visa",
    cardLast4: "4081",
    cardReusable: true,
    nextPaymentAt: "2026-11-02T00:00:00.000Z",
    cancelRequestedAt: null,
    cancelledAt: null,
    sessionsGranted: 4,
    createdAt: "2026-10-02T09:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SubscriptionsPage", () => {
  it("shows the plan, its monthly amount, and the sessions paid for", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription()],
    });

    render(<SubscriptionsPage />);

    expect(await screen.findByText("rhythm")).toBeTruthy();
    // en-ZA, as every other price in the app: "R 1 999,00", with a comma
    // decimal separator and non-breaking spaces. Matching on a function rather
    // than a string, because getByText normalises those away.
    const expected = formatSubscriptionAmount(199900, "ZAR");
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && (element.textContent ?? "").startsWith(expected),
      ),
    ).toBeTruthy();
    expect(screen.getByText(/\/ month$/)).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    // Brand and last four only: the PAN never exists on our side to display.
    expect(screen.getByText(/visa •••• 4081/)).toBeTruthy();
  });

  it("tells the customer their sessions are safe when a payment failed", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription({ status: "ATTENTION", nextPaymentAt: null })],
    });

    render(<SubscriptionsPage />);

    expect(await screen.findByText("Payment problem")).toBeTruthy();
    // The whole point of the grace period: nobody is locked out, and nobody
    // loses sessions they already paid for.
    expect(screen.getByText(/sessions are unaffected/i)).toBeTruthy();
  });

  it("warns when the stored card cannot be charged again", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription({ cardReusable: false })],
    });

    render(<SubscriptionsPage />);

    expect(await screen.findByText(/cannot be charged again/i)).toBeTruthy();
  });

  it("requires a confirmation before cancelling, and says sessions are kept", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription()],
    });
    api.cancelCustomerSubscription.mockResolvedValue(undefined);

    render(<SubscriptionsPage />);

    await screen.findByText("rhythm");
    fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

    // Not cancelled on the first click.
    expect(api.cancelCustomerSubscription).not.toHaveBeenCalled();
    expect(screen.getByText(/every session you have already paid for stays/i)).toBeTruthy();

    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription({ status: "CANCELLED", nextPaymentAt: null })],
    });
    fireEvent.click(screen.getByRole("button", { name: /yes, cancel my subscription/i }));

    await waitFor(() => expect(api.cancelCustomerSubscription).toHaveBeenCalledWith("SUB_1"));
    expect(await screen.findByText(/keep every session you have paid for/i)).toBeTruthy();
  });

  it("hides the cancel and update controls once a subscription has ended", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription({ status: "CANCELLED", nextPaymentAt: null })],
    });

    render(<SubscriptionsPage />);

    expect(await screen.findByText("Cancelled")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cancel subscription/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /update card/i })).toBeNull();
  });

  it("sends the customer to Paystack to update their card", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({
      enabled: true,
      subscriptions: [subscription()],
    });
    api.fetchSubscriptionManageLink.mockResolvedValue("https://paystack.test/manage/abc");
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign },
      writable: true,
      configurable: true,
    });

    render(<SubscriptionsPage />);
    await screen.findByText("rhythm");
    fireEvent.click(screen.getByRole("button", { name: /update card/i }));

    await waitFor(() => expect(api.fetchSubscriptionManageLink).toHaveBeenCalledWith("SUB_1"));
    expect(assign).toHaveBeenCalledWith("https://paystack.test/manage/abc");
  });

  it("says plainly when there is no subscription", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({ enabled: true, subscriptions: [] });

    render(<SubscriptionsPage />);

    expect(await screen.findByText(/do not have a monthly subscription/i)).toBeTruthy();
  });

  it("explains the feature is off rather than showing an empty page", async () => {
    api.fetchCustomerSubscriptions.mockResolvedValue({ enabled: false, subscriptions: [] });

    render(<SubscriptionsPage />);

    expect(await screen.findByText(/not switched on yet/i)).toBeTruthy();
  });

  it("surfaces a failure instead of rendering a blank page", async () => {
    api.fetchCustomerSubscriptions.mockRejectedValue(
      new Error("Chefmate could not load your subscription."),
    );

    render(<SubscriptionsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
  });
});
