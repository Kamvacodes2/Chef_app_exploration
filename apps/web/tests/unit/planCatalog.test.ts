import { describe, expect, it } from "vitest";
import {
  CHEFMATE_PLANS,
  findChefmatePlan,
  normalizeChefmatePlanId,
} from "@/features/plans/planCatalog";

describe("Chefmate plan catalog", () => {
  it("exposes only the four canonical purchase packages", () => {
    expect(CHEFMATE_PLANS.map((plan) => plan.id)).toEqual([
      "tonight",
      "rhythm",
      "family",
      "premium",
    ]);
    expect(findChefmatePlan("premium")?.name).toBe("chefmate premium");
  });

  it("keeps the legacy full-house deep link mapped to premium", () => {
    expect(normalizeChefmatePlanId("full-house")).toBe("premium");
    expect(normalizeChefmatePlanId("premium")).toBe("premium");
    expect(normalizeChefmatePlanId("unknown-plan")).toBeNull();
  });
});
