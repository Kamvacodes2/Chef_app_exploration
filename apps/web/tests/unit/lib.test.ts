import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";
import {
  getChefmateApiUrl,
  getMealsDataSource,
  resolveCatalogApiUrl,
  resolveChefmateApiUrl,
} from "@/lib/env";

describe("cn", () => {
  it("joins truthy class values with a space", () => {
    expect(cn("a", "b", null, undefined, false, "c")).toBe("a b c");
  });

  it("flattens nested arrays", () => {
    expect(cn(["a", ["b", "c"]])).toBe("a b c");
  });

  it("returns an empty string for no truthy input", () => {
    expect(cn(null, undefined, false)).toBe("");
  });
});

describe("getMealsDataSource", () => {
  it("defaults to local when the env var is unset", () => {
    const original = process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE;
    delete process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE;
    expect(getMealsDataSource()).toBe("local");
    if (original !== undefined) process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE = original;
  });

  it("returns http when explicitly set", () => {
    process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE = "http";
    expect(getMealsDataSource()).toBe("http");
    delete process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE;
  });
});

describe("resolveChefmateApiUrl", () => {
  it("reads the public booking URL used by browser code", () => {
    const original = process.env.NEXT_PUBLIC_CHEFMATE_API_URL;
    process.env.NEXT_PUBLIC_CHEFMATE_API_URL = "http://127.0.0.2:3002/";

    expect(getChefmateApiUrl()).toBe("http://127.0.0.2:3002");

    if (original === undefined) delete process.env.NEXT_PUBLIC_CHEFMATE_API_URL;
    else process.env.NEXT_PUBLIC_CHEFMATE_API_URL = original;
  });

  it("uses the local backend default outside production when unset", () => {
    expect(resolveChefmateApiUrl({ NODE_ENV: "test" })).toBe("http://localhost:3001");
  });

  it("fails clearly in production when unset", () => {
    expect(() => resolveChefmateApiUrl({ NODE_ENV: "production" })).toThrow(
      "NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production.",
    );
  });

  it("uses only the configured booking API URL without hard-coding production hosts", () => {
    expect(
      resolveChefmateApiUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_CHEFMATE_API_URL: "https://chefmate-api.example/",
      }),
    ).toBe("https://chefmate-api.example");
  });

  it("does not use the catalog-specific legacy meals API URL for booking requests", () => {
    expect(
      resolveChefmateApiUrl({
        NODE_ENV: "test",
        NEXT_PUBLIC_MEALS_API_URL: "https://catalog.example/api/v1/catalog",
      }),
    ).toBe("http://localhost:3001");
  });
});

describe("resolveCatalogApiUrl", () => {
  it("keeps the legacy meals API env as a fallback for HTTP catalog mode", () => {
    expect(
      resolveCatalogApiUrl({
        NODE_ENV: "development",
        NEXT_PUBLIC_MEALS_API_URL: "http://localhost:3001/api/v1/catalog/",
      }),
    ).toBe("http://localhost:3001/api/v1/catalog");
  });

  it("falls back to the booking API base for catalog calls when no catalog-specific URL is set", () => {
    expect(
      resolveCatalogApiUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_CHEFMATE_API_URL: "https://chefmate-api.example/",
      }),
    ).toBe("https://chefmate-api.example");
  });
});
