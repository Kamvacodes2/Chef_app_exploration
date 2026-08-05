import { z } from "zod";
import { getCatalogApiUrl } from "@/lib/env";

/**
 * Catalog client for the meal browser.
 *
 * Schemas are intentionally NOT `.strict()` — the catalog backend keeps adding
 * fields and unknown keys must never break the order flow. Fields the browser
 * actually depends on (slug, name, category, image, nutrition shape) are
 * required, so a genuine contract break still fails loudly.
 */

const nutritionProfileSchema = z.object({
  plateType: z.enum(["STANDARD", "BALANCED", "LOW_CARB"]),
  caloriesKcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  starchType: z.string().nullable().optional().default(null),
  starchCookedG: z.number().nullable().optional().default(null),
});

const mealImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const catalogMealSchema = z.object({
  slug: z.string().min(1),
  menuId: z.string().nullable().optional().default(null),
  categorySlug: z.string().min(1),
  categoryName: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  serves: z.string().nullable().optional().default(null),
  servesMin: z.number().nullable().optional().default(null),
  servesMax: z.number().nullable().optional().default(null),
  sessionFit: z.string().nullable().optional().default(null),
  ingredients: z.string().nullable().optional().default(null),
  recipeGuidelines: z.string().nullable().optional().default(null),
  recommendedSides: z.string().nullable().optional().default(null),
  optionalSides: z.string().nullable().optional().default(null),
  chefNote: z.string().nullable().optional().default(null),
  measurementNote: z.string().nullable().optional().default(null),
  image: mealImageSchema.nullable().optional().default(null),
  paletteId: z.string().optional().default("persimmon"),
  goalTags: z.array(z.string()).optional().default([]),
  isHot: z.boolean().optional().default(false),
  hasCutlery: z.boolean().optional().default(false),
  isSignature: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  featuredOrder: z.number().nullable().optional().default(null),
  nutritionProfiles: z.array(nutritionProfileSchema).optional().default([]),
});

const catalogCategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().optional().default(0),
  // The backend has renamed this count more than once; accept the aliases.
  mealCount: z.number().optional(),
  mealsCount: z.number().optional(),
  count: z.number().optional(),
});

const mealsResponseSchema = z.object({ data: z.array(catalogMealSchema) });
const categoriesResponseSchema = z.object({ data: z.array(catalogCategorySchema) });

export type MealNutritionProfile = z.infer<typeof nutritionProfileSchema>;
export type BrowserMealImage = z.infer<typeof mealImageSchema>;
export type BrowserMeal = z.infer<typeof catalogMealSchema>;

export interface BrowserMealCategory {
  readonly slug: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly mealCount: number;
}

export interface MealCatalogRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface FetchMealsQuery {
  readonly category?: string;
  readonly q?: string;
  readonly signature?: boolean;
  readonly featured?: boolean;
}

/** Reads the active meal catalog (45 meals; grouped into sections client-side). */
export async function fetchMeals(
  query: FetchMealsQuery = {},
  options: MealCatalogRequestOptions = {},
): Promise<readonly BrowserMeal[]> {
  const url =
    join(options.baseUrl ?? getCatalogApiUrl(), "/api/v1/catalog/meals") + toSearch(query);
  const payload = await readJson(url, options, "meals");
  return mealsResponseSchema.parse(payload).data;
}

/** Reads the catalog's categories so chips are never hardcoded in the UI. */
export async function fetchCategories(
  options: MealCatalogRequestOptions = {},
): Promise<readonly BrowserMealCategory[]> {
  const url = join(options.baseUrl ?? getCatalogApiUrl(), "/api/v1/catalog/categories");
  const payload = await readJson(url, options, "categories");
  return categoriesResponseSchema.parse(payload).data.map((category) => ({
    slug: category.slug,
    name: category.name,
    sortOrder: category.sortOrder,
    mealCount: category.mealCount ?? category.mealsCount ?? category.count ?? 0,
  }));
}

async function readJson(
  url: string,
  options: MealCatalogRequestOptions,
  label: string,
): Promise<unknown> {
  const response = await (options.fetchImpl ?? fetch)(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Chefmate catalog ${label} request failed (${response.status})`);
  }
  return response.json();
}

function toSearch(query: FetchMealsQuery): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.q) params.set("q", query.q);
  if (query.signature !== undefined) params.set("signature", String(query.signature));
  if (query.featured !== undefined) params.set("featured", String(query.featured));
  const search = params.toString();
  return search ? `?${search}` : "";
}

function join(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}
