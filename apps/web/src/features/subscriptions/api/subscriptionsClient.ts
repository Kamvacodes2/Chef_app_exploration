import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { readApiErrorMessage } from "@/lib/apiError";

/**
 * Customer self-service for Paystack recurring billing.
 *
 * Every response is parsed with zod rather than cast, so a backend change that
 * removes or renames a field surfaces as an error here instead of rendering
 * `undefined` into the customer's billing page.
 */

export interface SubscriptionsRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Mirrors `SubscriptionStatus` in the Prisma schema.
 *
 * `ATTENTION` is the grace period: a renewal failed, but the sessions already
 * paid for are untouched and the customer is not locked out.
 */
const subscriptionStatusSchema = z.enum([
  "ACTIVE",
  "NON_RENEWING",
  "ATTENTION",
  "COMPLETED",
  "CANCELLED",
]);

const subscriptionSchema = z.object({
  paystackSubscriptionCode: z.string().min(1),
  planId: z.string().min(1),
  status: subscriptionStatusSchema,
  currency: z.string().min(1),
  amountCents: z.number(),
  cardBrand: z.string().nullable(),
  cardLast4: z.string().nullable(),
  cardReusable: z.boolean().nullable(),
  nextPaymentAt: z.string().nullable(),
  cancelRequestedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  sessionsGranted: z.number(),
  createdAt: z.string(),
});

const listResponseSchema = z.object({
  data: z.object({
    enabled: z.boolean(),
    subscriptions: z.array(subscriptionSchema),
  }),
});

export type CustomerSubscription = z.infer<typeof subscriptionSchema>;
export type CustomerSubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export interface CustomerSubscriptionOverview {
  readonly enabled: boolean;
  readonly subscriptions: readonly CustomerSubscription[];
}

export async function fetchCustomerSubscriptions(
  options: SubscriptionsRequestOptions = {},
): Promise<CustomerSubscriptionOverview> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/account/subscriptions"),
    { method: "GET", credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Chefmate could not load your subscription."),
    );
  }
  return listResponseSchema.parse(await response.json()).data;
}

/**
 * A Paystack-hosted page where the customer updates their card or cancels.
 *
 * Preferred over our own cancel button: the change happens on Paystack's side,
 * so our record cannot disagree with what they will actually be charged.
 */
export async function fetchSubscriptionManageLink(
  code: string,
  options: SubscriptionsRequestOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(
      options.baseUrl ?? getChefmateApiUrl(),
      `/api/v1/account/subscriptions/manage-link?code=${encodeURIComponent(code)}`,
    ),
    { method: "GET", credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Chefmate could not open your billing page."),
    );
  }
  return z.object({ data: z.object({ url: z.string().url() }) }).parse(await response.json()).data
    .url;
}

/**
 * Cancels at the end of the period already paid for.
 *
 * Deliberately does not remove sessions: the customer keeps every one they
 * have paid for, and stops being charged.
 */
export async function cancelCustomerSubscription(
  code: string,
  options: SubscriptionsRequestOptions = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/account/subscriptions/cancel"),
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    },
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Chefmate could not cancel your subscription."),
    );
  }
}

/** "R1,999.00", from an integer number of cents. */
export function formatSubscriptionAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(
      amountCents / 100,
    );
  } catch {
    // An unknown currency code should not blank out the amount.
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatSubscriptionDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

function apiUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (!base) throw new Error("Chefmate API URL is not configured.");
  return base + path;
}
