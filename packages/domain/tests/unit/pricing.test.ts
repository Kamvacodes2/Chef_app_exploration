import { describe, expect, it } from "vitest";
import { calculatePricingQuote } from "../../src/catalog.js";

describe("Chefmate pricing", () => {
  it("charges the tonight plan, one extra side, and dessert without charging the main", () => {
    const quote = calculatePricingQuote({
      mainSlug: "chicken-peri-peri",
      sideSlugs: ["side-coleslaw", "side-mielies", "side-creamed-spinach"],
      dessertSlug: "dessert-malva",
      customRequest: null,
      giftCode: null,
    });

    expect(quote.plan?.id).toBe("tonight");
    expect(quote.items).toEqual([
      expect.objectContaining({ kind: "main", slug: "chicken-peri-peri", priceCents: 0 }),
      expect.objectContaining({ kind: "side", slug: "side-coleslaw", priceCents: 0 }),
      expect.objectContaining({ kind: "side", slug: "side-mielies", priceCents: 0 }),
      expect.objectContaining({ kind: "side", slug: "side-creamed-spinach", priceCents: 5_500 }),
      expect.objectContaining({ kind: "dessert", slug: "dessert-malva", priceCents: 9_000 }),
    ]);
    expect(quote.subtotalCents).toBe(67_285);
    expect(quote.totalCents).toBe(67_285);
    expect(quote.chefPayableCents).toBe(43_735);
    expect(quote.platformRevenueCents).toBe(23_550);
  });

  it("maps the legacy full-house id to the canonical premium plan", () => {
    const quote = calculatePricingQuote({
      mainSlug: "winter-oxtail-stew",
      sideSlugs: [],
      dessertSlug: null,
      customRequest: null,
      giftCode: "CHILL10",
      planSelection: {
        planId: "full-house",
        preferredDays: ["monday"],
        schedulePreference: "SELECTED_DAYS",
        favoriteMealSlug: "winter-oxtail-stew",
      },
    });

    expect(quote.plan).toMatchObject({ id: "premium", priceCents: 505_500 });
    expect(quote.discountCents).toBe(50_550);
    expect(quote.totalCents).toBe(454_950);
  });

  it("marks custom requests for manual review without taking payment", () => {
    const quote = calculatePricingQuote({
      mainSlug: "custom-request",
      sideSlugs: [],
      dessertSlug: null,
      customRequest: "A custom birthday menu",
      giftCode: null,
    });

    expect(quote.status).toBe("NEEDS_REVIEW");
    expect(quote.totalCents).toBe(0);
    expect(quote.plan).toBeNull();
    expect(quote.items).toEqual([]);
  });
});
