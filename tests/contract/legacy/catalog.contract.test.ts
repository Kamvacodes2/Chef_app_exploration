import { describe, expect, it } from "vitest";
import { HttpMealsRepository } from "@/data/repository/HttpMealsRepository";
import { fakeFetch, recordedCall } from "./support/fakeFetch";
import { LEGACY_BASE_URL, legacyCategory, legacyMeal } from "./support/fixtures";

/**
 * Legacy contracts 4-6: GET {catalogBase}/categories, GET {catalogBase}/meals
 * (with optional `?category=`), GET {catalogBase}/meals/{id}.
 *
 * Provider status: consumer expectation only (D001). The catalog client is the
 * one client whose path construction is base-URL dependent, and the one that
 * sends no credentials.
 */
describe("legacy contract: catalog", () => {
  it("prefixes /api/v1/catalog when the configured base URL is a bare origin", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyCategory] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await repository.getCategories();

    expect(recordedCall(fetchImpl).url).toBe("http://chefmate-api.test/api/v1/catalog/categories");
  });

  it("does not re-prefix when the configured base URL already ends in /catalog", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyCategory] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL + "/api/v1/catalog",
      fetchImpl as unknown as typeof fetch,
    );

    await repository.getCategories();

    expect(recordedCall(fetchImpl).url).toBe("http://chefmate-api.test/api/v1/catalog/categories");
  });

  it("trims exactly one trailing slash from the configured base URL", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyCategory] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL + "/",
      fetchImpl as unknown as typeof fetch,
    );

    await repository.getCategories();

    expect(recordedCall(fetchImpl).url).toBe("http://chefmate-api.test/api/v1/catalog/categories");
  });

  it("sends no credentials and no headers on catalog reads", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyCategory] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await repository.getCategories();

    expect(recordedCall(fetchImpl).init).toBeUndefined();
  });

  it("pins the category projection mapping (slug to id, sortOrder to order)", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyCategory] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await expect(repository.getCategories()).resolves.toMatchInlineSnapshot(`
      [
        {
          "id": "seven-colours",
          "mood": "Sunday plate",
          "name": "Seven Colours",
          "order": 0,
          "paletteId": "maize",
        },
      ]
    `);
  });

  it("pins the meal projection mapping, including the synthesized zero nutrition block", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyMeal] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await expect(repository.findAll()).resolves.toMatchInlineSnapshot(`
      [
        {
          "categoryId": "seven-colours",
          "description": "Roast chicken with seven colourful sides.",
          "hasCutlery": true,
          "id": "roast-chicken-seven-colours",
          "image": {
            "alt": "Roast chicken plated with colourful sides",
            "height": 900,
            "src": "/images/meals/roast-chicken-seven-colours.jpg",
            "width": 1200,
          },
          "isHot": true,
          "name": "Roast Chicken Seven Colours",
          "nutrition": {
            "carbs": 0,
            "fat": 0,
            "fibre": 0,
            "protein": 0,
          },
          "order": 3,
          "priceDisplay": "R527.85",
        },
      ]
    `);
  });

  it("encodes the category filter as a query parameter", async () => {
    const fetchImpl = fakeFetch({ body: { data: [legacyMeal] } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await repository.findByCategory("seven colours/plates");

    expect(recordedCall(fetchImpl).url).toBe(
      "http://chefmate-api.test/api/v1/catalog/meals?category=seven%20colours%2Fplates",
    );
  });

  it("encodes the meal id in the path segment", async () => {
    const fetchImpl = fakeFetch({ body: { data: legacyMeal } });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await repository.findById("roast chicken/seven colours");

    expect(recordedCall(fetchImpl).url).toBe(
      "http://chefmate-api.test/api/v1/catalog/meals/roast%20chicken%2Fseven%20colours",
    );
  });

  it("maps 404 on a single meal to undefined rather than an error", async () => {
    const fetchImpl = fakeFetch({ status: 404 });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await expect(repository.findById("missing-meal")).resolves.toBeUndefined();
  });

  it("uses a flat status-only error message and never reads the error body", async () => {
    const fetchImpl = fakeFetch({
      status: 500,
      body: { message: "This detailed message is ignored" },
    });
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fetchImpl as unknown as typeof fetch,
    );

    await expect(repository.findAll()).rejects.toThrow("Chefmate catalog request failed (500)");
    await expect(repository.findById("any")).rejects.toThrow(
      "Chefmate catalog request failed (500)",
    );
  });

  it("throws a configuration error when the resolved base URL is empty", async () => {
    // A blank constructor argument falls through to the resolved catalog URL, so
    // the guard is characterized through a stubbed empty resolution instead.
    const repository = new HttpMealsRepository(
      LEGACY_BASE_URL,
      fakeFetch() as unknown as typeof fetch,
    );
    Object.defineProperty(repository, "resolvedBaseUrl", { value: "", writable: false });

    await expect(repository.getCategories()).rejects.toThrow("Chefmate API URL is not configured.");
  });
});
