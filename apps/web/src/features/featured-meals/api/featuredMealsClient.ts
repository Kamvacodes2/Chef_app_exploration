import { z } from "zod";
import { getCatalogApiUrl, getChefmateApiUrl } from "@/lib/env";

/** The marquee always shows exactly this many meals. */
export const FEATURED_MEAL_COUNT = 6;

const catalogMealSchema = z.object({
  slug: z.string().min(1),
  categorySlug: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string(),
  priceCents: z.number().int().nonnegative().optional(),
  priceDisplay: z.string().optional(),
  image: z.object({
    src: z.string().min(1),
    alt: z.string(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }),
  isFeatured: z.boolean(),
  featuredOrder: z.number().int().nullable(),
});

const catalogMealsResponseSchema = z.object({ data: z.array(catalogMealSchema) });
const featuredMealsResponseSchema = z.object({
  data: z.object({ items: z.array(catalogMealSchema) }),
});
const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type CatalogMeal = z.infer<typeof catalogMealSchema>;

export interface FeaturedMealsRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

/** Error carrying the backend's machine-readable `error.code` so the UI can react to it. */
export class FeaturedMealsError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "FeaturedMealsError";
  }
}

/**
 * Reads the public catalog. Always talks to the real backend (never the local
 * static catalog) because featured meals are edited live by admins.
 */
export async function fetchCatalogMeals(
  options: FeaturedMealsRequestOptions & { readonly featured?: boolean } = {},
): Promise<readonly CatalogMeal[]> {
  const query = options.featured ? "?featured=true" : "";
  const url = join(options.baseUrl ?? getCatalogApiUrl(), `/api/v1/catalog/meals${query}`);
  const response = await (options.fetchImpl ?? fetch)(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Chefmate catalog request failed (${response.status})`);
  }
  return catalogMealsResponseSchema.parse(await response.json()).data;
}

/** Reads the current featured six (ADMIN-only convenience endpoint). */
export async function fetchFeaturedMeals(
  options: FeaturedMealsRequestOptions = {},
): Promise<readonly CatalogMeal[]> {
  const response = await sendOperations("GET", undefined, options);
  return featuredMealsResponseSchema.parse(await readOk(response)).data.items;
}

/** Replaces the featured six, in the given order. ADMIN-only. */
export async function updateFeaturedMeals(
  mealSlugs: readonly string[],
  options: FeaturedMealsRequestOptions = {},
): Promise<readonly CatalogMeal[]> {
  const response = await sendOperations("PUT", { mealSlugs }, options);
  return featuredMealsResponseSchema.parse(await readOk(response)).data.items;
}

async function sendOperations(
  method: "GET" | "PUT",
  body: unknown,
  options: FeaturedMealsRequestOptions,
): Promise<Response> {
  const url = join(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/operations/featured-meals");
  return (options.fetchImpl ?? fetch)(url, {
    method,
    credentials: "include",
    signal: options.signal,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

async function readOk(response: Response): Promise<unknown> {
  if (response.ok) return response.json();
  throw await toFeaturedMealsError(response);
}

async function toFeaturedMealsError(response: Response): Promise<FeaturedMealsError> {
  const fallback = `Featured meals request failed (${response.status})`;
  try {
    const parsed = apiErrorSchema.safeParse(await response.json());
    if (!parsed.success) return new FeaturedMealsError(fallback, "unknown_error");
    return new FeaturedMealsError(parsed.data.error.message, parsed.data.error.code);
  } catch {
    return new FeaturedMealsError(fallback, "unknown_error");
  }
}

function join(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}
