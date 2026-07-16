import { z } from "zod";
import { paletteIdSchema } from "./palette.schema";

export const mealImageSchema = z.object({
  src: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  alt: z.string().min(1),
});

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  paletteId: paletteIdSchema,
  mood: z.string().min(1),
  order: z.number().int().nonnegative(),
});

export const mealNutritionSchema = z.object({
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fibre: z.number().nonnegative(),
});

export const mealSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  priceDisplay: z.string().min(1),
  image: mealImageSchema,
  isHot: z.boolean(),
  hasCutlery: z.boolean(),
  order: z.number().int().nonnegative(),
  nutrition: mealNutritionSchema,
});

export const mealsDataSchema = z.object({
  categories: z.array(categorySchema),
  meals: z.array(mealSchema),
});

export type MealNutritionSchemaType = z.infer<typeof mealNutritionSchema>;
export type MealSchemaType = z.infer<typeof mealSchema>;
export type CategorySchemaType = z.infer<typeof categorySchema>;
export type MealsDataSchemaType = z.infer<typeof mealsDataSchema>;
