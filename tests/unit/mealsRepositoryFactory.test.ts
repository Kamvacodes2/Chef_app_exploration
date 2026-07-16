import { afterEach, describe, expect, it } from "vitest";
import { createMealsRepository } from "@/data/repository/mealsRepositoryFactory";
import { LocalMealsRepository } from "@/data/repository/LocalMealsRepository";
import { HttpMealsRepository } from "@/data/repository/HttpMealsRepository";

describe("createMealsRepository", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE;
  });

  it("returns a LocalMealsRepository by default", () => {
    expect(createMealsRepository()).toBeInstanceOf(LocalMealsRepository);
  });

  it("returns an HttpMealsRepository when configured", () => {
    process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE = "http";
    expect(createMealsRepository()).toBeInstanceOf(HttpMealsRepository);
  });
});
