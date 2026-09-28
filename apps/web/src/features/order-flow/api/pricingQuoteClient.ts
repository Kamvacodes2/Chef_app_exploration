import { z } from "zod";
import { buildPlanSelection } from "@/features/plans/planSelection";
import type { ChefmatePlanSelection } from "@/features/plans/planCatalog";
import { getChefmateApiUrl } from "@/lib/env";
import type { OrderState } from "../state/orderReducer";
import { OVERNIGHT_OATS_SLUG } from "../constants/menu";

const pricingItemSchema = z.object({
  kind: z.enum(["main", "side", "dessert", "addon"]),
  slug: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

const pricingQuoteResponseSchema = z.object({
  data: z.object({
    subtotalCents: z.number().int().nonnegative(),
    discountCents: z.number().int().nonnegative(),
    totalCents: z.number().int().nonnegative(),
    items: z.array(pricingItemSchema),
    plan: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        sessions: z.string().min(1),
        recurring: z.boolean(),
        priceCents: z.number().int().nonnegative(),
      })
      .nullable()
      .optional(),
  }),
});

export interface PricingQuotePayload {
  readonly mainSlug: string;
  /**
   * Signed-out shopper identity hint: the email typed at checkout. The API uses
   * it to recognise an existing customer (and their prepaid subscription) so a
   * session drawn from a package is quoted as included, not as a one-off order.
   */
  readonly contactEmail?: string | null;
  readonly sideSlugs: readonly string[];
  readonly dessertSlug: string | null;
  readonly customRequest: string | null;
  readonly customRequestLink?: string | null;
  readonly giftCode: string | null;
  readonly planSelection?: ChefmatePlanSelection;
  /**
   * Meal-prep second meal for bookings with no plan selection (goal/discovery
   * flows). Plan bookings carry it in planSelection.secondFavoriteMealSlug.
   */
  readonly secondMainSlug?: string | null;
  /** Free breakfast add-on (overnight oats) for subscription plans. */
  readonly breakfastAddOnSlug?: string | null;
}

export interface PricingQuote {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
  readonly items: readonly {
    readonly kind: "main" | "side" | "dessert" | "addon";
    readonly slug: string;
    readonly name: string;
    readonly priceCents: number;
    readonly sortOrder: number;
  }[];
  readonly plan?: {
    readonly id: string;
    readonly name: string;
    readonly sessions: string;
    readonly recurring: boolean;
    readonly priceCents: number;
  } | null;
}

export function buildPricingQuotePayload(
  state: Pick<
    OrderState,
    | "main"
    | "sides"
    | "dessert"
    | "customRequest"
    | "customRequestLink"
    | "appliedGift"
    | "planId"
    | "preferredDays"
    | "planScheduleDeferred"
    | "favoriteMealId"
    | "favoriteMealLink"
    | "secondFavoriteMealId"
    | "secondFavoriteMealLink"
    | "favoriteMealDeferred"
    | "breakfastAddOn"
    | "extraMeals"
    | "extraMealLinks"
    | "dayMealAssignments"
    | "dayMealsDeferred"
    | "dayTimeWindows"
    | "dayTimeSlots"
    | "dayMealPlans"
    | "week2DayMealPlans"
    | "week2Deferred"
    | "firstSessionDate"
  > & {
    /**
     * The email a signed-out shopper typed at checkout, so the quote can honour
     * an existing customer account (and its subscription package). Omitted when
     * the shopper is signed in, where the API uses the authenticated account.
     */
    readonly contactEmail?: string | null;
  },
): PricingQuotePayload | null {
  if (!state.main) return null;

  const planSelection = buildPlanSelection(state);
  // Only a complete address is sent: the API rejects a malformed one, which
  // would fail the whole quote and lock checkout while the customer is still
  // half-way through typing their email.
  const contactEmail = state.contactEmail?.trim() ?? "";
  const hasCompleteEmail = /^\S+@\S+\.\S+$/.test(contactEmail);
  return {
    mainSlug: state.main.id,
    ...(hasCompleteEmail ? { contactEmail } : {}),
    sideSlugs: state.sides.map((side) => side.id),
    dessertSlug: state.dessert?.id ?? null,
    customRequest: state.customRequest,
    ...(state.customRequestLink ? { customRequestLink: state.customRequestLink } : {}),
    giftCode: state.appliedGift?.code ?? null,
    ...(state.breakfastAddOn ? { breakfastAddOnSlug: OVERNIGHT_OATS_SLUG } : {}),
    ...(planSelection
      ? { planSelection }
      : state.secondFavoriteMealId
        ? { secondMainSlug: state.secondFavoriteMealId }
        : {}),
  };
}

export async function fetchPricingQuote(
  payload: PricingQuotePayload,
  options: {
    readonly signal?: AbortSignal;
    readonly baseUrl?: string;
    readonly fetchImpl?: typeof fetch;
  } = {},
): Promise<PricingQuote> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/booking-requests/quote"),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    },
  );

  if (!response.ok) throw new Error("Chefmate pricing quote failed (" + response.status + ")");
  return pricingQuoteResponseSchema.parse(await response.json()).data;
}

function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}
