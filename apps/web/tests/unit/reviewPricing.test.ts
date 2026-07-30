import { describe, expect, it } from "vitest";
import { formatZarCents, pricingLineLabel } from "@/features/order-flow/components/ReviewStep";

describe("review price formatting", () => {
  it("keeps cents for Chefmate Tonight pricing", () => {
    expect(formatZarCents(52785)).toMatch(/527[.,]85/);
  });

  it("does not add decimal places to whole-rand totals", () => {
    expect(formatZarCents(379900)).not.toContain(".00");
  });
  it("labels server-authoritative included and paid line items", () => {
    expect(pricingLineLabel(undefined)).toBe("Pending");
    expect(pricingLineLabel(0)).toBe("Included");
    expect(pricingLineLabel(5500)).toMatch(/55/);
    expect(pricingLineLabel(9000)).toMatch(/90/);
  });
});
