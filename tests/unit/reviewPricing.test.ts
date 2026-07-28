import { describe, expect, it } from "vitest";
import { formatZarCents } from "@/features/order-flow/components/ReviewStep";

describe("review price formatting", () => {
  it("keeps cents for Chefmate Tonight pricing", () => {
    expect(formatZarCents(52785)).toMatch(/527[.,]85/);
  });

  it("does not add decimal places to whole-rand totals", () => {
    expect(formatZarCents(379900)).not.toContain(".00");
  });
});