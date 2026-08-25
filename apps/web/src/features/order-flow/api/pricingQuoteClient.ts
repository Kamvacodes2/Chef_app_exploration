import { z } from "zod";
import { buildPlanSelection } from "@/features/plans/planSelection";
import type { ChefmatePlanSelection } from "@/features/plans/planCatalog";
import { getChefmateApiUrl } from "@/lib/env";
import type { OrderState } from "../state/orderReducer";

const pricingItemSchema = z.object({
  kind: z.enum(["main", "side", "dessert"]),
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
  readonly sideSlugs: readonly string[];
  readonly dessertSlug: string | null;
  readonly customRequest: string | null;
  readonly giftCode: string | null;
  readonly planSelection?: ChefmatePlanSelection;
}

export interface PricingQuote {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
  readonly items: readonly {
    readonly kind: "main" | "side" | "dessert";
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
    | "appliedGift"
    | "planId"
    | "preferredDays"
    | "planScheduleDeferred"
    | "favoriteMealId"
    | "secondFavoriteMealId"
    | "favoriteMealDeferred"
  >,
): PricingQuotePayload | null {
  if (!state.main) return null;

  const planSelection = buildPlanSelection(state);
  return {
    mainSlug: state.main.id,
    sideSlugs: state.sides.map((side) => side.id),
    dessertSlug: state.dessert?.id ?? null,
    customRequest: state.customRequest,
    giftCode: state.appliedGift?.code ?? null,
    ...(planSelection ? { planSelection } : {}),
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
