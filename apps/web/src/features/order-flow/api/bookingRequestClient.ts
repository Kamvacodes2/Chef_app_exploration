import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { ChefmateApiError, readApiErrorDetails } from "@/lib/apiError";
import type { Address, ContactDetails, GoalId } from "../types";
import type { OrderState } from "../state/orderReducer";
import { buildPlanSelection } from "@/features/plans/planSelection";
import type { ChefmatePlanSelection } from "@/features/plans/planCatalog";

export type BookingRequestStatus =
  | "REQUESTED"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "AWAITING_CHEF"
  | "CHEF_MATCHED"
  | "EN_ROUTE"
  | "CANCELLED"
  | "COMPLETED";

export interface BookingRequestPayload {
  readonly source: "landing-order-flow";
  readonly goalId: GoalId | null;
  readonly mainSlug: string;
  readonly sideSlugs: readonly string[];
  readonly dessertSlug: string | null;
  readonly customRequest: string | null;
  readonly scheduledDate: string;
  readonly timeSlot: string;
  readonly address: Address;
  /** Omitted for a signed-in customer; the API uses their authenticated account. */
  readonly contact?: ContactDetails;
  readonly giftCode: string | null;
  readonly planSelection?: ChefmatePlanSelection;
}

export interface BuildBookingRequestOptions {
  readonly useAccountContact?: boolean;
}

export interface BankTransferInstructions {
  readonly bankName: string;
  readonly branchName: string;
  readonly branchCode: string;
  readonly electronicBranchCode?: string;
  readonly swiftCode?: string;
  readonly accountHolder: string;
  readonly accountNumber: string;
  readonly accountType: string;
  readonly paymentReference: string;
}

export interface PaystackCheckoutDetails {
  readonly authorizationUrl: string | null;
  readonly accessCode: string | null;
}

export interface BookingPayment {
  readonly method: "BANK_TRANSFER" | "PAYSTACK";
  readonly provider: "BANK_TRANSFER" | "PAYSTACK";
  readonly status: "PENDING" | "SUBMITTED" | "VERIFIED" | "DECLINED";
  readonly bankTransfer: BankTransferInstructions | null;
  readonly paystack: PaystackCheckoutDetails | null;
}

export interface BookingRequestResult {
  readonly id: string;
  readonly reference: string;
  readonly status: BookingRequestStatus;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
  readonly payment: BookingPayment | null;
}

export interface SubmitBookingRequestOptions {
  readonly idempotencyKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export interface InitializePaystackCheckoutOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export interface PaystackCheckoutResult {
  readonly payment: BookingPayment;
  readonly authorizationUrl: string;
}

const paymentStatusSchema = z.enum(["PENDING", "SUBMITTED", "VERIFIED", "DECLINED"]);

const bankTransferSchema = z.object({
  bankName: z.string().min(1),
  branchName: z.string().min(1),
  branchCode: z.string().min(1),
  electronicBranchCode: z.string().min(1).optional(),
  swiftCode: z.string().min(1).optional(),
  accountHolder: z.string().min(1),
  accountNumber: z.string().min(1),
  accountType: z.string().min(1),
  paymentReference: z.string().min(1),
});

const paystackCheckoutDetailsSchema = z.object({
  authorizationUrl: z.string().min(1).nullable(),
  accessCode: z.string().min(1).nullable(),
});

const bookingPaymentSchema = z
  .object({
    method: z.enum(["BANK_TRANSFER", "PAYSTACK"]),
    provider: z.enum(["BANK_TRANSFER", "PAYSTACK"]).optional(),
    status: paymentStatusSchema,
    bankTransfer: bankTransferSchema.nullable().optional(),
    paystack: paystackCheckoutDetailsSchema.nullable().optional(),
  })
  .transform((payment): BookingPayment => ({
    method: payment.method,
    provider: payment.provider ?? payment.method,
    status: payment.status,
    bankTransfer: payment.bankTransfer ?? null,
    paystack: payment.paystack ?? null,
  }));

const bookingResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    reference: z.string().min(1),
    status: z.enum([
      "REQUESTED",
      "NEEDS_REVIEW",
      "CONFIRMED",
      "AWAITING_CHEF",
      "CHEF_MATCHED",
      "EN_ROUTE",
      "CANCELLED",
      "COMPLETED",
    ]),
    subtotalCents: z.number().int().nonnegative(),
    discountCents: z.number().int().nonnegative(),
    totalCents: z.number().int().nonnegative(),
    payment: bookingPaymentSchema.nullable(),
  }),
});

const paystackCheckoutResponseSchema = z.object({
  data: z.object({
    payment: bookingPaymentSchema,
  }),
});

export function buildBookingRequestPayload(
  state: OrderState,
  options: BuildBookingRequestOptions = {},
): BookingRequestPayload {
  if (!state.main) throw new Error("Choose a main meal before sending the request.");
  if (!state.date) throw new Error("Choose a date before sending the request.");
  if (!state.time) throw new Error("Choose a time before sending the request.");
  if (state.address.street.trim().length <= 2) throw new Error("Street address is required.");
  if (state.address.area.trim().length <= 1) throw new Error("Area or suburb is required.");

  const contact = options.useAccountContact ? undefined : validatedGuestContact(state.contact);
  const planSelection = buildPlanSelection(state);

  return {
    source: "landing-order-flow",
    goalId: state.goalId,
    mainSlug: state.main.id,
    sideSlugs: state.sides.map((side) => side.id),
    dessertSlug: state.dessert?.id ?? null,
    customRequest: state.customRequest,
    scheduledDate: state.date,
    timeSlot: state.time,
    address: {
      ...state.address,
      estate: state.address.estate.trim(),
      unit: state.address.unit.trim(),
      street: state.address.street.trim(),
      area: state.address.area.trim(),
    },
    ...(contact ? { contact } : {}),
    giftCode: state.appliedGift?.code ?? null,
    ...(planSelection ? { planSelection } : {}),
  };
}

function validatedGuestContact(contact: ContactDetails): ContactDetails {
  if (contact.name.trim().length <= 1) throw new Error("Contact name is required.");
  if (!/^\S+@\S+\.\S+$/.test(contact.email.trim()))
    throw new Error("A valid contact email is required.");

  return {
    name: contact.name.trim(),
    email: contact.email.trim().toLowerCase(),
    phone: normalizePhoneNumber(contact.phone),
  };
}

function normalizePhoneNumber(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("00")
    ? "+" + compact.slice(2)
    : compact.startsWith("0")
      ? "+27" + compact.slice(1)
      : compact;

  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("A valid contact phone number is required.");
  }

  return normalized;
}

export function bookingRequestFingerprint(payload: BookingRequestPayload): string {
  return JSON.stringify(payload);
}

export async function submitBookingRequestPayload(
  payload: BookingRequestPayload,
  options: SubmitBookingRequestOptions,
): Promise<BookingRequestResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/booking-requests"),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": options.idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw await chefmateApiError(
      response,
      "Chefmate booking request failed (" + response.status + ")",
    );
  }

  return bookingResponseSchema.parse(await response.json()).data;
}

export async function initializePaystackCheckout(
  bookingReference: string,
  options: InitializePaystackCheckoutOptions = {},
): Promise<PaystackCheckoutResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(
      options.baseUrl ?? getChefmateApiUrl(),
      "/api/v1/payments/checkout/" + encodeURIComponent(bookingReference),
    ),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw await chefmateApiError(response, "Chefmate checkout failed (" + response.status + ")");
  }

  const payment = paystackCheckoutResponseSchema.parse(await response.json()).data.payment;
  if (payment.method !== "PAYSTACK" || !payment.paystack?.authorizationUrl) {
    throw new Error("Chefmate checkout did not return a Paystack payment link.");
  }

  return {
    payment,
    authorizationUrl: payment.paystack.authorizationUrl,
  };
}

function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}

async function chefmateApiError(response: Response, fallback: string): Promise<ChefmateApiError> {
  return new ChefmateApiError(response.status, await readApiErrorDetails(response, fallback));
}
