import { describe, expect, it } from "vitest";
import { LocalMealsRepository } from "@/data/repository/LocalMealsRepository";

const validData = {
  categories: [
    { id: "cat-a", name: "Cat A", paletteId: "olive", mood: "fresh", order: 1 },
    { id: "cat-b", name: "Cat B", paletteId: "persimmon", mood: "golden", order: 0 },
  ],
  meals: [
    {
      id: "meal-1",
      categoryId: "cat-a",
      name: "Meal 1",
      description: "desc",
      priceDisplay: "R10",
      image: { src: "/a.webp", width: 10, height: 10, alt: "a" },
      isHot: false,
      hasCutlery: false,
      order: 0,
      nutrition: { protein: 10, carbs: 10, fat: 10, fibre: 2 },
    },
    {
      id: "meal-2",
      categoryId: "cat-b",
      name: "Meal 2",
      description: "desc",
      priceDisplay: "R20",
      image: { src: "/b.webp", width: 10, height: 10, alt: "b" },
      isHot: true,
      hasCutlery: true,
      order: 0,
      nutrition: { protein: 12, carbs: 12, fat: 8, fibre: 3 },
    },
  ],
};

describe("LocalMealsRepository", () => {
  it("returns categories sorted by order", async () => {
    const repo = new LocalMealsRepository(validData);
    const categories = await repo.getCategories();
    expect(categories.map((c) => c.id)).toEqual(["cat-b", "cat-a"]);
  });

  it("returns all meals", async () => {
    const repo = new LocalMealsRepository(validData);
    const meals = await repo.findAll();
    expect(meals).toHaveLength(2);
  });

  it("filters meals by category", async () => {
    const repo = new LocalMealsRepository(validData);
    const meals = await repo.findByCategory("cat-a");
    expect(meals).toHaveLength(1);
    expect(meals[0]?.id).toBe("meal-1");
  });

  it("finds a meal by id", async () => {
    const repo = new LocalMealsRepository(validData);
    const meal = await repo.findById("meal-2");
    expect(meal?.name).toBe("Meal 2");
  });

  it("returns undefined for an unknown id", async () => {
    const repo = new LocalMealsRepository(validData);
    const meal = await repo.findById("does-not-exist");
    expect(meal).toBeUndefined();
  });

  it("throws when the raw data fails schema validation", async () => {
    const repo = new LocalMealsRepository({ categories: [], meals: [{ id: "bad" }] });
    await expect(repo.findAll()).rejects.toThrow();
  });

  it("caches the parsed result across calls (same underlying meal objects)", async () => {
    const repo = new LocalMealsRepository(validData);
    const first = await repo.findAll();
    const second = await repo.findAll();
    expect(first[0]).toBe(second[0]);
  });
});
