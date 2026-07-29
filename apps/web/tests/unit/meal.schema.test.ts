import { describe, expect, it } from "vitest";
import { mealSchema, mealsDataSchema } from "@/data/schema/meal.schema";
import mealsJson from "../../data/meals.json";

const validMeal = {
  id: "meal-1",
  categoryId: "cat-a",
  name: "Meal 1",
  description: "desc",
  priceDisplay: "R10",
  image: { src: "/a.webp", width: 10, height: 10, alt: "a" },
  isHot: false,
  hasCutlery: false,
  order: 0,
  nutrition: { protein: 10, carbs: 20, fat: 5, fibre: 3 },
};

describe("meal.schema", () => {
  it("accepts a well-formed meal", () => {
    expect(() => mealSchema.parse(validMeal)).not.toThrow();
  });

  it("rejects a meal missing required fields", () => {
    const withoutName: Partial<typeof validMeal> = { ...validMeal };
    delete withoutName.name;
    expect(() => mealSchema.parse(withoutName)).toThrow();
  });

  it("rejects a negative order", () => {
    expect(() => mealSchema.parse({ ...validMeal, order: -1 })).toThrow();
  });

  it("rejects a non-positive image dimension", () => {
    expect(() =>
      mealSchema.parse({ ...validMeal, image: { ...validMeal.image, width: 0 } }),
    ).toThrow();
  });

  it("validates the real bundled meals.json end-to-end", () => {
    expect(() => mealsDataSchema.parse(mealsJson)).not.toThrow();
  });

  it("rejects negative nutrition values", () => {
    expect(() =>
      mealSchema.parse({ ...validMeal, nutrition: { ...validMeal.nutrition, protein: -1 } }),
    ).toThrow();
  });

  it("rejects a meal missing nutrition", () => {
    const withoutNutrition: Partial<typeof validMeal> = { ...validMeal };
    delete withoutNutrition.nutrition;
    expect(() => mealSchema.parse(withoutNutrition)).toThrow();
  });
});
