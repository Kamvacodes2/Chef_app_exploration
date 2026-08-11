import { describe, expect, it, vi } from "vitest";
import { createRecipe, type RecipeFormPayload } from "@/features/platform/api/adminRecipesClient";

const BASE_URL = "https://api.chefmate.test";

const validPayload: RecipeFormPayload = {
  name: "Lemon Herb Chicken",
  description: "A bright, family-style roast chicken dinner with Mediterranean herbs.",
  categorySlug: "popular-family-suppers",
  imageAlt: "Roast chicken with lemon and herbs on a platter",
  serves: "4-6",
  ingredients: ["1 whole chicken", "2 lemons", "Fresh rosemary"],
  instructions: ["Preheat oven to 180C", "Season chicken", "Roast for 90 minutes"],
  nutritionProfiles: [
    { plateType: "STANDARD", caloriesKcal: 620, proteinG: 35, carbsG: 66, fatG: 23 },
  ],
};

const catalogMealResponse = {
  slug: "admin-lemon-herb-chicken-a1b2c3d4",
  categorySlug: "popular-family-suppers",
  categoryName: "Popular Family Suppers",
  name: "Lemon Herb Chicken",
  description: "A bright, family-style roast chicken dinner with Mediterranean herbs.",
  priceCents: 0,
  priceDisplay: "NOT_CHARGED",
  image: {
    src: "/api/v1/catalog/media/test-key.webp",
    alt: "Roast chicken with lemon and herbs on a platter",
    width: 800,
    height: 600,
  },
  paletteId: "persimmon",
  isHot: false,
  hasCutlery: true,
  isSignature: false,
  sortOrder: 0,
  goalTags: [],
  aliases: [],
  isFeatured: false,
  featuredOrder: null,
  menuId: null,
  serves: "4-6",
  servesMin: null,
  servesMax: null,
  sessionFit: null,
  ingredients: "Chicken\nLemon\nRosemary",
  recipeGuidelines: "1) Preheat 2) Season 3) Roast",
  recommendedSides: null,
  optionalSides: null,
  chefNote: null,
  measurementNote: null,
  isActive: true,
  nutritionProfiles: [
    {
      plateType: "STANDARD",
      caloriesKcal: 620,
      proteinG: 35,
      carbsG: 66,
      fatG: 23,
      starchType: null,
      starchCookedG: null,
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("adminRecipesClient", () => {
  it("sends multipart POST with FormData", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: catalogMealResponse }, 201),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/operations/catalog/meals"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: expect.any(FormData),
      }),
    );

    // Verify FormData structure via the mocked call args
    const callArgs = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const formData = callArgs[1].body as FormData;
    expect(formData.has("recipe")).toBe(true);
    expect(formData.has("image")).toBe(true);
    expect(formData.get("image")).toBe(file);
  });

  it("does not manually set Content-Type header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: catalogMealResponse }, 201),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    await createRecipe(validPayload, file, { fetchImpl });

    const init = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toBeUndefined();
  });

  it("returns ok:true with parsed CatalogMeal on success", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: catalogMealResponse }, 201),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meal.slug).toBe("admin-lemon-herb-chicken-a1b2c3d4");
      expect(result.meal.name).toBe("Lemon Herb Chicken");
      expect(result.meal.isActive).toBe(true);
      expect(result.meal.isFeatured).toBe(false);
    }
  });

  it("returns ok:false with error code on 401", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: "unauthorized", message: "Authentication required" } }, 401),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unauthorized");
      expect(result.message).toBe("Authentication required");
    }
  });

  it("returns ok:false with error code on 403", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: "insufficient_role", message: "Not authorized" } }, 403),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("insufficient_role");
    }
  });

  it("returns ok:false on 422 validation error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: "validation_error", message: "Name too short" } }, 422),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_error");
    }
  });

  it("returns ok:false on 413 file too large", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: "file_too_large", message: "File too large" } }, 413),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("file_too_large");
    }
  });

  it("returns ok:false on 503 uploads disabled", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: "uploads_disabled", message: "Uploads not enabled" } }, 503),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("uploads_disabled");
    }
  });

  it("handles non-JSON error responses gracefully", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response("Internal Server Error", { status: 500 }),
      ) as unknown as typeof fetch;

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await createRecipe(validPayload, file, { fetchImpl });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("http_500");
    }
  });
});
