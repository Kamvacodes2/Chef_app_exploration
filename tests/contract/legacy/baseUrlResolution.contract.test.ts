import { describe, expect, it } from "vitest";
import { resolveCatalogApiUrl, resolveChefmateApiUrl } from "@/lib/env";

/**
 * Cross-cutting legacy contract: how the browser resolves the external API base
 * URL for all 11 endpoints. This is the cutover boundary documented in
 * docs/architecture/legacy-contract-characterization.md.
 */
describe("legacy contract: API base URL resolution", () => {
  it("trims whitespace and exactly one trailing slash", () => {
    expect(resolveChefmateApiUrl({ NEXT_PUBLIC_CHEFMATE_API_URL: "  http://api.test/  " })).toBe(
      "http://api.test",
    );
    expect(resolveChefmateApiUrl({ NEXT_PUBLIC_CHEFMATE_API_URL: "http://api.test//" })).toBe(
      "http://api.test/",
    );
  });

  it("falls back to http://localhost:3001 outside production", () => {
    expect(resolveChefmateApiUrl({ NODE_ENV: "development" })).toBe("http://localhost:3001");
    expect(resolveChefmateApiUrl({ NODE_ENV: "test" })).toBe("http://localhost:3001");
    expect(resolveChefmateApiUrl({ NEXT_PUBLIC_CHEFMATE_API_URL: "   ", NODE_ENV: "test" })).toBe(
      "http://localhost:3001",
    );
  });

  it("throws in production when the API URL is unset", () => {
    expect(() => resolveChefmateApiUrl({ NODE_ENV: "production" })).toThrow(
      "NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production.",
    );
    expect(() => resolveCatalogApiUrl({ NODE_ENV: "production" })).toThrow(
      "NEXT_PUBLIC_MEALS_API_URL or NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production.",
    );
  });

  it("prefers NEXT_PUBLIC_MEALS_API_URL for the catalog, then falls back to the Chefmate API URL", () => {
    expect(
      resolveCatalogApiUrl({
        NEXT_PUBLIC_MEALS_API_URL: "http://catalog.test/api/v1/catalog",
        NEXT_PUBLIC_CHEFMATE_API_URL: "http://api.test",
      }),
    ).toBe("http://catalog.test/api/v1/catalog");

    expect(resolveCatalogApiUrl({ NEXT_PUBLIC_CHEFMATE_API_URL: "http://api.test" })).toBe(
      "http://api.test",
    );
  });
});
