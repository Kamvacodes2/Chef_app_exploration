import type { Category, Meal } from "@/data/types/Meal";

/** Storage-agnostic contract for reading meal/category data. */
export interface MealsRepository {
  getCategories(): Promise<readonly Category[]>;
  findAll(): Promise<readonly Meal[]>;
  findByCategory(categoryId: string): Promise<readonly Meal[]>;
  findById(mealId: string): Promise<Meal | undefined>;
}
