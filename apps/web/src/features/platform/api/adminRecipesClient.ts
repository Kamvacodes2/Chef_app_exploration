import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { readApiErrorMessage } from "@/lib/apiError";

// ---------------------------------------------------------------------------
// Zod schemas matching the backend CatalogMeal response
// ---------------------------------------------------------------------------

const catalogNutritionProfileSchema = z.object({
  plateType: z.enum(["STANDARD", "BALANCED", "LOW_CARB"]),
  caloriesKcal: z.number().int().min(0),
  proteinG: z.number().int().min(0),
  carbsG: z.number().int().min(0),
  fatG: z.number().int().min(0),
  starchType: z.string().nullable(),
  starchCookedG: z.number().int().nullable(),
});

const catalogMealSchema = z.object({
  slug: z.string().min(1),
  categorySlug: z.string().min(1),
  categoryName: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  priceCents: z.number(),
  priceDisplay: z.string(),
  image: z.object({
    src: z.string(),
    alt: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  paletteId: z.string(),
  isHot: z.boolean(),
  hasCutlery: z.boolean(),
  isSignature: z.boolean(),
  sortOrder: z.number().int(),
  goalTags: z.array(z.string()),
  aliases: z.array(z.string()),
  isFeatured: z.boolean(),
  featuredOrder: z.number().int().nullable(),
  menuId: z.string().nullable(),
  serves: z.string().nullable(),
  servesMin: z.number().int().nullable(),
  servesMax: z.number().int().nullable(),
  sessionFit: z.string().nullable(),
  ingredients: z.string().nullable(),
  recipeGuidelines: z.string().nullable(),
  recommendedSides: z.string().nullable(),
  optionalSides: z.string().nullable(),
  chefNote: z.string().nullable(),
  measurementNote: z.string().nullable(),
  isActive: z.boolean(),
  nutritionProfiles: z.array(catalogNutritionProfileSchema),
});

const createRecipeResponseSchema = z.object({
  data: catalogMealSchema,
});

const createRecipeErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogMeal = z.infer<typeof catalogMealSchema>;
export type CatalogNutritionProfile = z.infer<typeof catalogNutritionProfileSchema>;

export interface RecipeFormPayload {
  readonly name: string;
  readonly description: string;
  readonly categorySlug: string;
  readonly imageAlt: string;
  readonly serves: string;
  readonly servesMin?: number;
  readonly servesMax?: number;
  readonly sessionFit?: string;
  readonly ingredients: readonly string[];
  readonly instructions: readonly string[];
  readonly nutritionProfiles: readonly NutritionProfileInput[];
}

export interface NutritionProfileInput {
  readonly plateType: "STANDARD" | "BALANCED" | "LOW_CARB";
  readonly caloriesKcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly starchType?: string;
  readonly starchCookedG?: number;
}

export interface CreateRecipeResult {
  readonly ok: true;
  readonly meal: CatalogMeal;
}

export interface CreateRecipeError {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export async function createRecipe(
  payload: RecipeFormPayload,
  imageFile: File,
): Promise<CreateRecipeResult | CreateRecipeError> {
  const formData = new FormData();
  formData.append("recipe", JSON.stringify(payload));
  formData.append("image", imageFile);

  const response = await fetch(`${getChefmateApiUrl()}/api/v1/operations/catalog/meals`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.ok) {
    const parsed = createRecipeResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false, code: "parse_error", message: "Unexpected server response." };
    }
    return { ok: true, meal: parsed.data.data };
  }

  const parsed = createRecipeErrorSchema.safeParse(await safeJson(response));
  if (parsed.success) {
    return { ok: false, code: parsed.data.error.code, message: parsed.data.error.message };
  }

  return {
    ok: false,
    code: `http_${response.status}`,
    message: await readApiErrorMessage(response, `Request failed (${response.status}).`),
  };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return {};
  }
}
