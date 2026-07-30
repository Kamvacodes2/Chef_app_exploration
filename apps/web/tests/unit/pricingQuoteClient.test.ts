import { describe, expect, it, vi } from "vitest";
import {
  buildPricingQuotePayload,
  fetchPricingQuote,
} from "@/features/order-flow/api/pricingQuoteClient";
import { INITIAL_ORDER_STATE } from "@/features/order-flow/state/orderReducer";

describe("pricingQuoteClient", () => {
  it("builds a selection-only request and parses package-priced server lines", async () => {
    const state = {
      ...INITIAL_ORDER_STATE,
      main: {
        id: "winter-oxtail-stew",
        name: "Oxtail Stew",
        description: "",
        priceDisplay: "Included in package",
        price: 0,
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
          priceDisplay: "First 2 included, then R55",
          price: 55,
          course: "side",
          imageSrc: "/side.jpg",
          imageAlt: "Coleslaw",
          paletteId: "warm-linen",
          goalTags: [],
        },
        {
          id: "side-potato-salad",
          name: "Potato Salad",
          description: "",
          priceDisplay: "First 2 included, then R55",
          price: 55,
          course: "side",
          imageSrc: "/side-2.jpg",
          imageAlt: "Potato salad",
          paletteId: "vanilla",
          goalTags: [],
        },
        {
          id: "side-green-salad",
          name: "Green Salad",
          description: "",
          priceDisplay: "First 2 included, then R55",
          price: 55,
          course: "side",
          imageSrc: "/side-3.jpg",
          imageAlt: "Green salad",
          paletteId: "olive",
          goalTags: [],
        },
      ],
      dessert: {
        id: "dessert-malva",
        name: "Malva Pudding",
        description: "",
        priceDisplay: "R90",
        price: 90,
        course: "dessert",
        imageSrc: "/dessert.jpg",
        imageAlt: "Malva pudding",
        paletteId: "vanilla",
        goalTags: [],
      },
    } as const;

    expect(buildPricingQuotePayload(state)).toEqual({
      mainSlug: "winter-oxtail-stew",
      sideSlugs: ["side-coleslaw", "side-potato-salad", "side-green-salad"],
      dessertSlug: "dessert-malva",
      customRequest: null,
      giftCode: null,
    });

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            subtotalCents: 67285,
            discountCents: 0,
            totalCents: 67285,
            plan: {
              id: "tonight",
              name: "chefmate tonight",
              sessions: "Once-off",
              recurring: false,
              priceCents: 52785,
            },
            items: [
              {
                kind: "main",
                slug: "winter-oxtail-stew",
                name: "Oxtail Stew",
                priceCents: 0,
                sortOrder: 0,
              },
              {
                kind: "side",
                slug: "side-coleslaw",
                name: "Coleslaw",
                priceCents: 0,
                sortOrder: 1,
              },
              {
                kind: "side",
                slug: "side-potato-salad",
                name: "Potato Salad",
                priceCents: 0,
                sortOrder: 2,
              },
              {
                kind: "side",
                slug: "side-green-salad",
                name: "Green Salad",
                priceCents: 5500,
                sortOrder: 3,
              },
              {
                kind: "dessert",
                slug: "dessert-malva",
                name: "Malva Pudding",
                priceCents: 9000,
                sortOrder: 4,
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

    expect(quote).toMatchObject({
      subtotalCents: 67285,
      totalCents: 67285,
      plan: { id: "tonight", priceCents: 52785 },
    });
    expect(quote.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "winter-oxtail-stew", priceCents: 0 }),
        expect.objectContaining({ slug: "side-coleslaw", priceCents: 0 }),
        expect.objectContaining({ slug: "side-potato-salad", priceCents: 0 }),
        expect.objectContaining({ slug: "side-green-salad", priceCents: 5500 }),
        expect.objectContaining({ slug: "dessert-malva", priceCents: 9000 }),
      ]),
    );
  });
});
