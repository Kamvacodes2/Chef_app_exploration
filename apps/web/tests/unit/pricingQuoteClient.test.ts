import { describe, expect, it, vi } from "vitest";
import {
  buildPricingQuotePayload,
  fetchPricingQuote,
} from "@/features/order-flow/api/pricingQuoteClient";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";

describe("pricingQuoteClient", () => {
  it("builds a selection-only request and parses the server price", async () => {
    const state = {
      ...INITIAL_ORDER_STATE,
      main: {
        id: "winter-oxtail-stew",
        name: "Oxtail Stew",
        description: "",
        priceDisplay: "R159",
        price: 159,
        course: "main",
        imageSrc: "/main.jpg",
        imageAlt: "Oxtail stew",
        paletteId: "espresso",
        goalTags: [],
      },
      sides: [
        {
          id: "side-coleslaw",
          name: "Coleslaw",
          description: "",
          priceDisplay: "R30",
          price: 30,
          course: "side",
          imageSrc: "/side.jpg",
          imageAlt: "Coleslaw",
          paletteId: "warm-linen",
          goalTags: [],
        },
      ],
      dessert: null,
    } as const;

    expect(buildPricingQuotePayload(state)).toEqual({
      mainSlug: "winter-oxtail-stew",
      sideSlugs: ["side-coleslaw"],
      dessertSlug: null,
      customRequest: null,
      giftCode: null,
    });

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            subtotalCents: 18900,
            discountCents: 0,
            totalCents: 18900,
            items: [
              {
                kind: "main",
                slug: "winter-oxtail-stew",
                name: "Oxtail Stew",
                priceCents: 15900,
                sortOrder: 0,
              },
              {
                kind: "side",
                slug: "side-coleslaw",
                name: "Coleslaw",
                priceCents: 3000,
                sortOrder: 1,
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const quote = await fetchPricingQuote(buildPricingQuotePayload(state)!, {
      baseUrl: "http://api.example.test",
      fetchImpl,
    });
    expect(quote.totalCents).toBe(18900);
    expect(quote.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "winter-oxtail-stew", priceCents: 15900 }),
        expect.objectContaining({ slug: "side-coleslaw", priceCents: 3000 }),
      ]),
    );
  });
});
