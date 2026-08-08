import { describe, expect, it } from "vitest";
import { resolveChefmateApiUrl, resolveCatalogApiUrl } from "@/lib/env";

describe("resolveChefmateApiUrl", () => {
  it("returns configured URL trimmed", () => {
    const result = resolveChefmateApiUrl({
      NEXT_PUBLIC_CHEFMATE_API_URL: "https://chefmate.co.za/",
    });
    expect(result).toBe("https://chefmate.co.za");
  });

  it("throws in production without config", () => {
    expect(() => resolveChefmateApiUrl({ NODE_ENV: "production" })).toThrow("must be configured");
  });

  it("returns localhost in development without config", () => {
    const result = resolveChefmateApiUrl({ NODE_ENV: "development" });
    expect(result).toBe("http://localhost:3001");
  });
});

describe("resolveCatalogApiUrl", () => {
  it("uses MEALS_API_URL when configured", () => {
    const result = resolveCatalogApiUrl({
      NEXT_PUBLIC_MEALS_API_URL: "https://meals.chefmate.co.za/",
    });
    expect(result).toBe("https://meals.chefmate.co.za");
  });

  it("falls back to CHEFMATE_API_URL", () => {
    const result = resolveCatalogApiUrl({
      NEXT_PUBLIC_CHEFMATE_API_URL: "https://chefmate.co.za/",
    });
    expect(result).toBe("https://chefmate.co.za");
  });

  it("throws in production without any URL", () => {
    expect(() => resolveCatalogApiUrl({ NODE_ENV: "production" })).toThrow("must be configured");
  });
});
