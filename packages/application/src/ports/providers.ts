import type { Cents, Currency } from "@chefmate/domain";

/**
 * Provider ports (ADR-0006, `D011`-`D014`).
 *
 * These are **type-only declarations**. No vendor SDK is imported here or
 * anywhere else in the application layer — that is precisely what makes it
 * possible for section 18 integration and E2E tests to run against fakes plus
 * captured provider fixtures.
 *
 * S02 scaffolds the boundary only. Live adapters arrive in S07 (payments),
 * S10/S11 (email/WhatsApp) and S13 (transfers).
 */

/** Caller-supplied key that makes a retried command a no-op, not a duplicate. */
export type IdempotencyKey = string;

export interface ProviderReference {
  readonly provider: string;
  readonly reference: string;
}

// ---------------------------------------------------------------------------
// PaymentProvider — D011, collect-to-platform only (ADR-0005: never split at
// checkout).
// ---------------------------------------------------------------------------

export interface InitiateCheckoutInput {
  readonly idempotencyKey: IdempotencyKey;
  readonly amountCents: Cents;
  readonly currency: Currency;
  readonly customerEmail: string;
  readonly callbackUrl: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface InitiateCheckoutResult extends ProviderReference {
  readonly redirectUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  initiateCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult>;
  /** Signature verification runs against the raw body (invariant 4.3.5). */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
}

// ---------------------------------------------------------------------------
// PayoutProvider — D012, chef transfers with a dual-controlled manual fallback
// behind the same state machine.
// ---------------------------------------------------------------------------

export interface InitiateTransferInput {
  readonly idempotencyKey: IdempotencyKey;
  readonly amountCents: Cents;
  readonly currency: Currency;
  readonly recipientReference: string;
}

export interface PayoutProvider {
  readonly name: string;
  initiateTransfer(input: InitiateTransferInput): Promise<ProviderReference>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
}

// ---------------------------------------------------------------------------
// MailProvider — D013. MessagingProvider — D014.
// ---------------------------------------------------------------------------

export interface SendEmailInput {
  readonly idempotencyKey: IdempotencyKey;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface MailProvider {
  readonly name: string;
  sendTransactional(input: SendEmailInput): Promise<ProviderReference>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
}

export interface SendTemplateMessageInput {
  readonly idempotencyKey: IdempotencyKey;
  readonly toE164: string;
  /** Only pre-approved templates may be sent proactively (`D014`). */
  readonly templateName: string;
  readonly variables: Readonly<Record<string, string>>;
}

export interface MessagingProvider {
  readonly name: string;
  sendTemplate(input: SendTemplateMessageInput): Promise<ProviderReference>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
}
