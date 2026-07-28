import { describe, expect, it, vi } from "vitest";
import { HttpMealsRepository } from "@/data/repository/HttpMealsRepository";

const categoryResponse = {
  data: [
    {
      slug: "sunday-lunch",
      name: "Seven Colours Sunday Lunch",
      paletteId: "blood-red",
      mood: "Elegant evening",
      sortOrder: 1,
    },
  ],
};

const meal = {
  slug: "winter-oxtail-stew",
  categorySlug: "beef-premium",
  name: "Oxtail Stew",
  description: "Slow-braised oxtail in a rich gravy.",
  priceDisplay: "R159",
  image: {
    src: "/images/meals/beef-premium/oxtail-stew.webp",
    alt: "Oxtail stew",
    width: 675,
    height: 1200,
  },
  isHot: true,
  hasCutlery: true,
  sortOrder: 0,
};

function okJson(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

describe("HttpMealsRepository", () => {
  it("loads categories from the Chefmate catalog API", async () => {
    const fetchImpl = vi.fn(async () => okJson(categoryResponse));
    const repo = new HttpMealsRepository("https://api.example.com", fetchImpl as unknown as typeof fetch);

    await expect(repo.getCategories()).resolves.toEqual([
      {
        id: "sunday-lunch",
        name: "Seven Colours Sunday Lunch",
        paletteId: "blood-red",
        mood: "Elegant evening",
        order: 1,
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/api/v1/catalog/categories");
  });

  it("loads and maps meals, preserving public slugs", async () => {
    const fetchImpl = vi.fn(async () => okJson({ data: [meal] }));
    const repo = new HttpMealsRepository("https://api.example.com/api/v1/catalog", fetchImpl as unknown as typeof fetch);

    const meals = await repo.findAll();

    expect(meals[0]?.id).toBe("winter-oxtail-stew");
    expect(meals[0]?.categoryId).toBe("beef-premium");
    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/api/v1/catalog/meals");
  });

  it("filters meals by category using the safe local backend default when unset", async () => {
    const fetchImpl = vi.fn(async () => okJson({ data: [meal] }));
    const repo = new HttpMealsRepository("", fetchImpl as unknown as typeof fetch);

    await repo.findByCategory("beef-premium");

    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3001/api/v1/catalog/meals?category=beef-premium");
  });

  it("returns undefined for missing meal detail", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response);
    const repo = new HttpMealsRepository("https://api.example.com", fetchImpl as unknown as typeof fetch);

    await expect(repo.findById("missing-meal")).resolves.toBeUndefined();
  });

  it("throws on failed catalog requests", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response);
    const repo = new HttpMealsRepository("https://api.example.com", fetchImpl as unknown as typeof fetch);

    await expect(repo.findAll()).rejects.toThrow("Chefmate catalog request failed (500)");
  });
});
