import { describe, expect, it } from "vitest";
import { HttpMealsRepository } from "@/data/repository/HttpMealsRepository";

describe("HttpMealsRepository", () => {
  it("throws for every method (stub not yet implemented)", async () => {
    const repo = new HttpMealsRepository("https://example.com");
    await expect(repo.getCategories()).rejects.toThrow();
    await expect(repo.findAll()).rejects.toThrow();
    await expect(repo.findByCategory()).rejects.toThrow();
    await expect(repo.findById()).rejects.toThrow();
  });
});
