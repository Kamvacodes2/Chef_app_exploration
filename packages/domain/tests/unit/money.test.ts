import { describe, expect, it } from "vitest";
import {
  addCents,
  cents,
  formatZar,
  isCents,
  MoneyError,
  nonNegativeCents,
  SUPPORTED_CURRENCY,
  subtractCents,
} from "../../src/index.js";

/**
 * Invariant 4.1.7: all money is integer cents; floating-point money is
 * forbidden. These tests exist so that a later step cannot quietly relax it.
 */

describe("cents", () => {
  it("accepts exact integers including zero and negatives", () => {
    expect(cents(0)).toBe(0);
    expect(cents(52_785)).toBe(52_785);
    expect(cents(-9_000)).toBe(-9_000);
  });

  it("rejects a fractional amount", () => {
    expect(() => cents(527.85)).toThrow(MoneyError);
    expect(() => cents(0.1 + 0.2)).toThrow(/integer number of cents/);
  });

  it("rejects non-finite values", () => {
    expect(() => cents(Number.NaN)).toThrow(/finite/);
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it("rejects amounts beyond the safe integer range", () => {
    expect(() => cents(Number.MAX_SAFE_INTEGER + 2)).toThrow(MoneyError);
  });

  it("narrows with isCents", () => {
    expect(isCents(100)).toBe(true);
    expect(isCents(1.5)).toBe(false);
    expect(isCents("100")).toBe(false);
    expect(isCents(null)).toBe(false);
  });
});

describe("nonNegativeCents", () => {
  it("accepts zero and positive amounts", () => {
    expect(nonNegativeCents(0)).toBe(0);
    expect(nonNegativeCents(5_500)).toBe(5_500);
  });

  it("rejects a negative amount", () => {
    expect(() => nonNegativeCents(-1)).toThrow(/must not be negative/);
  });
});

describe("arithmetic stays in integers", () => {
  it("adds and subtracts exactly", () => {
    // Two extra sides at R55 plus one dessert at R90 (invariants 4.1.4, 4.1.5).
    expect(addCents(cents(5_500), cents(5_500), cents(9_000))).toBe(20_000);
    expect(subtractCents(cents(52_785), cents(34_310))).toBe(18_475);
  });

  it("sums an empty list to zero", () => {
    expect(addCents()).toBe(0);
  });
});

describe("formatZar", () => {
  it("renders whole and fractional Rand", () => {
    expect(formatZar(cents(52_785))).toBe("R527.85");
    expect(formatZar(cents(9_000))).toBe("R90.00");
    expect(formatZar(cents(5))).toBe("R0.05");
  });

  it("groups thousands", () => {
    expect(formatZar(cents(505_500))).toBe("R5 055.00");
    expect(formatZar(cents(199_900))).toBe("R1 999.00");
  });

  it("renders negative amounts with a leading sign", () => {
    expect(formatZar(cents(-32_484))).toBe("-R324.84");
  });
});

describe("currency", () => {
  it("is ZAR only", () => {
    expect(SUPPORTED_CURRENCY).toBe("ZAR");
  });
});
