import type {
  MailProvider,
  MessagingProvider,
  PaymentProvider,
  PayoutProvider,
} from "@chefmate/application";

/**
 * Provider adapter registry.
 *
 * No adapter is registered in S02 and no vendor SDK is a dependency of this
 * package. Resolving an unregistered port therefore throws — which is the
 * intended behaviour, because a scaffold-stage process must never appear to
 * have a working payment or messaging path.
 */

export type ProviderPortName = "payment" | "payout" | "mail" | "messaging";

export class ProviderNotConfiguredError extends Error {
  public readonly port: ProviderPortName;

  constructor(port: ProviderPortName) {
    super(
      `No adapter is registered for the ${port} provider port. ` +
        "Adapters are introduced in S07 (payments), S10/S11 (email and WhatsApp) and S13 (transfers).",
    );
    this.name = "ProviderNotConfiguredError";
    this.port = port;
  }
}

export interface ProviderRegistry {
  readonly payment?: PaymentProvider;
  readonly payout?: PayoutProvider;
  readonly mail?: MailProvider;
  readonly messaging?: MessagingProvider;
}

export function requirePayment(registry: ProviderRegistry): PaymentProvider {
  if (registry.payment === undefined) throw new ProviderNotConfiguredError("payment");
  return registry.payment;
}

export function requirePayout(registry: ProviderRegistry): PayoutProvider {
  if (registry.payout === undefined) throw new ProviderNotConfiguredError("payout");
  return registry.payout;
}

export function requireMail(registry: ProviderRegistry): MailProvider {
  if (registry.mail === undefined) throw new ProviderNotConfiguredError("mail");
  return registry.mail;
}

export function requireMessaging(registry: ProviderRegistry): MessagingProvider {
  if (registry.messaging === undefined) throw new ProviderNotConfiguredError("messaging");
  return registry.messaging;
}

/** The S02 registry: intentionally empty. */
export const emptyProviderRegistry: ProviderRegistry = Object.freeze({});
