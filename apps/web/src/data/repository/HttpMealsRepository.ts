import { z } from "zod";
import type { Category, Meal } from "@/data/types/Meal";
import { getCatalogApiUrl } from "@/lib/env";
import type { MealsRepository } from "./MealsRepository";

const apiCategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  paletteId: z.string().min(1),
  mood: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
});

const apiMealSchema = z.object({
  slug: z.string().min(1),
  categorySlug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  priceDisplay: z.string().min(1),
  image: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  isHot: z.boolean(),
  hasCutlery: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});

const categoriesResponseSchema = z.object({ data: z.array(apiCategorySchema) });
const mealsResponseSchema = z.object({ data: z.array(apiMealSchema) });
const mealResponseSchema = z.object({ data: apiMealSchema });

/** HTTP-backed repository for the Chefmate catalog API. */
export class HttpMealsRepository implements MealsRepository {
  private readonly resolvedBaseUrl: string;

  constructor(
    baseUrl?: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.resolvedBaseUrl = (baseUrl?.trim() || getCatalogApiUrl()).replace(/\/$/, "");
  }

  async getCategories(): Promise<readonly Category[]> {
    const response = await this.getJson(this.endpoint("/categories"));
    return categoriesResponseSchema.parse(response).data.map((category) => ({
      id: category.slug,
      name: category.name,
      paletteId: category.paletteId as Category["paletteId"],
      mood: category.mood,
      order: category.sortOrder,
    }));
  }

  async findAll(): Promise<readonly Meal[]> {
    const response = await this.getJson(this.endpoint("/meals"));
    return mealsResponseSchema.parse(response).data.map(toMeal);
  }

  async findByCategory(categoryId: string): Promise<readonly Meal[]> {
    const response = await this.getJson(
      this.endpoint(`/meals?category=${encodeURIComponent(categoryId)}`),
    );
    return mealsResponseSchema.parse(response).data.map(toMeal);
  }

  async findById(mealId: string): Promise<Meal | undefined> {
    const response = await this.fetchImpl(this.endpoint(`/meals/${encodeURIComponent(mealId)}`));
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Chefmate catalog request failed (${response.status})`);
    return toMeal(mealResponseSchema.parse(await response.json()).data);
  }

  private endpoint(path: string): string {
    if (!this.resolvedBaseUrl) throw new Error("Chefmate API URL is not configured.");
    return this.resolvedBaseUrl.endsWith("/catalog")
      ? `${this.resolvedBaseUrl}${path}`
      : `${this.resolvedBaseUrl}/api/v1/catalog${path}`;
  }

  private async getJson(url: string): Promise<unknown> {
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error(`Chefmate catalog request failed (${response.status})`);
    return response.json();
  }
}

function toMeal(meal: z.infer<typeof apiMealSchema>): Meal {
  return {
    id: meal.slug,
    categoryId: meal.categorySlug,
    name: meal.name,
    description: meal.description,
    priceDisplay: meal.priceDisplay,
    image: meal.image,
    isHot: meal.isHot,
    hasCutlery: meal.hasCutlery,
    order: meal.sortOrder,
    nutrition: {
      protein: 0,
      carbs: 0,
      fat: 0,
      fibre: 0,
    },
  };
}
