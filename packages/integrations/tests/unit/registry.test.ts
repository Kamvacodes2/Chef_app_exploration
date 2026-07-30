import { describe, expect, it, vi } from "vitest";
import type {
  MailProvider,
  MessagingProvider,
  PaymentProvider,
  PayoutProvider,
} from "@chefmate/application";
import {
  emptyProviderRegistry,
  ProviderNotConfiguredError,
  requireMail,
  requireMessaging,
  requirePayment,
  requirePayout,
} from "../../src/registry.js";

const verifyWebhookSignature = vi.fn(() => true);

const payment: PaymentProvider = {
  name: "fake-payment",
  initiateCheckout: vi.fn(async () => ({
    provider: "fake-payment",
    reference: "checkout-1",
    redirectUrl: "https://checkout.example.test/session/1",
  })),
  verifyWebhookSignature,
};

const payout: PayoutProvider = {
  name: "fake-payout",
  initiateTransfer: vi.fn(async () => ({ provider: "fake-payout", reference: "transfer-1" })),
  verifyWebhookSignature,
};

const mail: MailProvider = {
  name: "fake-mail",
  sendTransactional: vi.fn(async () => ({ provider: "fake-mail", reference: "email-1" })),
  verifyWebhookSignature,
};

const messaging: MessagingProvider = {
  name: "fake-messaging",
  sendTemplate: vi.fn(async () => ({ provider: "fake-messaging", reference: "message-1" })),
  verifyWebhookSignature,
};

describe("provider registry", () => {
  it("throws a named error for every missing provider port", () => {
    const cases = [
      ["payment", () => requirePayment(emptyProviderRegistry)],
      ["payout", () => requirePayout(emptyProviderRegistry)],
      ["mail", () => requireMail(emptyProviderRegistry)],
      ["messaging", () => requireMessaging(emptyProviderRegistry)],
    ] as const;

    for (const [port, resolve] of cases) {
      expect(resolve).toThrow(ProviderNotConfiguredError);

      try {
        resolve();
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderNotConfiguredError);
        expect((error as ProviderNotConfiguredError).port).toBe(port);
        expect((error as Error).message).toContain(`No adapter is registered for the ${port}`);
      }
    }
  });

  it("returns configured adapters unchanged", () => {
    expect(requirePayment({ payment })).toBe(payment);
    expect(requirePayout({ payout })).toBe(payout);
    expect(requireMail({ mail })).toBe(mail);
    expect(requireMessaging({ messaging })).toBe(messaging);
  });
});
