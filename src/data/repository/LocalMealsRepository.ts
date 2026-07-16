import { mealsDataSchema } from "@/data/schema/meal.schema";
import type { Category, Meal, MealsData } from "@/data/types/Meal";
import type { MealsRepository } from "./MealsRepository";

/**
 * Reads meal data from a locally bundled JSON source, validates it against
 * the zod schema, and caches the parsed result in memory for subsequent reads.
 */
export class LocalMealsRepository implements MealsRepository {
  private cache: MealsData | undefined;

  constructor(private readonly rawData: unknown) {}

  private load(): MealsData {
    if (this.cache) return this.cache;
    const parsed = mealsDataSchema.parse(this.rawData);
    this.cache = parsed;
    return parsed;
  }

  async getCategories(): Promise<readonly Category[]> {
    const data = this.load();
    return [...data.categories].sort((a, b) => a.order - b.order);
  }

  async findAll(): Promise<readonly Meal[]> {
    const data = this.load();
    return [...data.meals].sort((a, b) => a.order - b.order);
  }

  async findByCategory(categoryId: string): Promise<readonly Meal[]> {
    const meals = await this.findAll();
    return meals.filter((meal) => meal.categoryId === categoryId);
  }

  async findById(mealId: string): Promise<Meal | undefined> {
    const meals = await this.findAll();
    return meals.find((meal) => meal.id === mealId);
  }
}
