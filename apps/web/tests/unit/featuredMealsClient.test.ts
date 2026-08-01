import { describe, expect, it, vi } from "vitest";
import {
  FEATURED_MEAL_COUNT,
  FeaturedMealsError,
  fetchCatalogMeals,
  fetchFeaturedMeals,
  updateFeaturedMeals,
} from "@/features/featured-meals/api/featuredMealsClient";

const BASE_URL = "https://api.chefmate.test";

const meal = {
  slug: "winter-oxtail-stew",
  categorySlug: "beef-premium",
  name: "Oxtail Stew",
  description: "Slow-braised oxtail in a rich, hearty gravy.",
  priceCents: 15900,
  priceDisplay: "R159",
  image: { src: "/images/meals/oxtail.webp", alt: "Oxtail stew", width: 675, height: 1200 },
  paletteId: "espresso",
  isHot: true,
  hasCutlery: true,
  isSignature: true,
  sortOrder: 0,
  goalTags: ["comfort"],
  aliases: [],
  isFeatured: true,
  featuredOrder: 0,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("featuredMealsClient", () => {
  it("exposes the six-meal contract constant", () => {
    expect(FEATURED_MEAL_COUNT).toBe(6);
  });

  it("requests the unfiltered catalog by default", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [meal] }));

    const meals = await fetchCatalogMeals({ baseUrl: BASE_URL, fetchImpl });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${BASE_URL}/api/v1/catalog/meals`);
    expect(meals[0]?.isFeatured).toBe(true);
  });

  it("appends featured=true when only the featured meals are wanted", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [meal] }));

    await fetchCatalogMeals({ baseUrl: BASE_URL, fetchImpl, featured: true });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${BASE_URL}/api/v1/catalog/meals?featured=true`);
  });

  it("throws when the catalog request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 503 }));

    await expect(fetchCatalogMeals({ baseUrl: BASE_URL, fetchImpl })).rejects.toThrow(
      "Chefmate catalog request failed (503)",
    );
  });

  it("reads the current featured meals from the operations endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [meal] } }));

    const items = await fetchFeaturedMeals({ baseUrl: BASE_URL, fetchImpl });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${BASE_URL}/api/v1/operations/featured-meals`);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      credentials: "include",
    });
    expect(items).toHaveLength(1);
  });

  it("PUTs the ordered slugs with credentials", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [meal] } }));

    await updateFeaturedMeals(["a", "b"], { baseUrl: BASE_URL, fetchImpl });

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
    expect(init.body).toBe(JSON.stringify({ mealSlugs: ["a", "b"] }));
  });

  it("surfaces the backend error code and message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: { code: "duplicate_meal_slugs", message: "Duplicate meal slugs: meal-a" },
        },
        422,
      ),
    );

    await expect(
      updateFeaturedMeals(["a"], { baseUrl: BASE_URL, fetchImpl }),
    ).rejects.toMatchObject({
      code: "duplicate_meal_slugs",
      message: "Duplicate meal slugs: meal-a",
    });
  });

  it("falls back to a status-coded error when the body is not the error envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));

    const caught = await updateFeaturedMeals(["a"], { baseUrl: BASE_URL, fetchImpl }).catch(
      (error: unknown) => error,
    );

    expect(caught).toBeInstanceOf(FeaturedMealsError);
    expect((caught as FeaturedMealsError).code).toBe("unknown_error");
  });

  it("rejects an empty base URL rather than requesting a relative path", async () => {
    await expect(fetchCatalogMeals({ baseUrl: "   ", fetchImpl: vi.fn() })).rejects.toThrow(
      "Chefmate API URL is not configured.",
    );
  });
});
