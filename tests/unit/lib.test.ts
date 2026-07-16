import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";
import { getMealsDataSource } from "@/lib/env";

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
