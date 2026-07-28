import { describe, expect, it } from "vitest";
import { fetchPricingQuote } from "@/features/order-flow/api/pricingQuoteClient";
import { fakeFetch, wireRequest } from "./support/fakeFetch";
import { LEGACY_BASE_URL, legacyQuoteResponse } from "./support/fixtures";

/**
 * Legacy contract 8: POST /api/v1/booking-requests/quote.
 *
 * Provider status: consumer expectation only (D001). The browser already treats
 * the quote as server-authoritative (invariant 4.1.3), which S01 preserves.
 */
const payload = {
  mainSlug: "roast-chicken-seven-colours",
  sideSlugs: ["creamed-spinach", "mielies", "coleslaw"],
  dessertSlug: "malva-pudding",
  customRequest: null,
  giftCode: null,
} as const;

describe("legacy contract: pricing quote", () => {
  it("pins the quote request wire shape", async () => {
    const fetchImpl = fakeFetch({ body: legacyQuoteResponse });

    await fetchPricingQuote(payload, { baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(wireRequest(fetchImpl)).toMatchInlineSnapshot(`
      {
        "body": {
          "customRequest": null,
          "dessertSlug": "malva-pudding",
          "giftCode": null,
          "mainSlug": "roast-chicken-seven-colours",
          "sideSlugs": [
            "creamed-spinach",
            "mielies",
            "coleslaw",
          ],
        },
        "credentials": "include",
        "hasAbortSignal": false,
        "headers": {
          "Content-Type": "application/json",
        },
        "method": "POST",
        "origin": "http://chefmate-api.test",
        "pathname": "/api/v1/booking-requests/quote",
        "search": "",
      }
    `);
  });

  it("pins the parsed quote projection returned to the browser", async () => {
    const fetchImpl = fakeFetch({ body: legacyQuoteResponse });

    await expect(
      fetchPricingQuote(payload, { baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).resolves.toEqual(legacyQuoteResponse.data);
  });

  it("LEGACY DEFECT: accepts a priced main item, contradicting invariant 4.1.2 and D005", async () => {
    const fetchImpl = fakeFetch({ body: legacyQuoteResponse });

    const quote = await fetchPricingQuote(payload, {
      baseUrl: LEGACY_BASE_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const main = quote.items.find((item) => item.kind === "main");

    // Recorded, not corrected: `pricingItemSchema` requires `priceCents` on every
    // item kind including `main`. The blueprint forbids a per-main customer price.
    // Remediation belongs to S04 (pricing contract freeze); see ADR-0004.
    expect(main?.priceCents).toBe(52785);
    expect(main?.priceCents).not.toBe(0);
  });

  it("LEGACY FACT: carries the pre-rename full-house plan id on the wire", async () => {
    const fetchImpl = fakeFetch({ body: legacyQuoteResponse });

    const quote = await fetchPricingQuote(payload, {
      baseUrl: LEGACY_BASE_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(quote.plan?.id).toBe("full-house");
    expect(quote.plan?.priceCents).toBe(505500);
  });

  it("requires integer-cent money on every quote field", async () => {
    const fetchImpl = fakeFetch({
      body: { data: { ...legacyQuoteResponse.data, totalCents: 672.85, items: [], plan: null } },
    });

    await expect(
      fetchPricingQuote(payload, { baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow();
  });

  it("accepts an omitted or null plan", async () => {
    const withoutPlan = { subtotalCents: 52785, discountCents: 0, totalCents: 52785, items: [] };

    await expect(
      fetchPricingQuote(payload, {
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: fakeFetch({ body: { data: withoutPlan } }) as unknown as typeof fetch,
      }),
    ).resolves.toEqual(withoutPlan);

    await expect(
      fetchPricingQuote(payload, {
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: fakeFetch({ body: { data: { ...withoutPlan, plan: null } } }) as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({ plan: null });
  });

  it("uses a flat status-only error message and never reads the error body", async () => {
    const fetchImpl = fakeFetch({ status: 422, body: { message: "This detailed message is ignored" } });

    await expect(
      fetchPricingQuote(payload, { baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Chefmate pricing quote failed (422)");
  });

  it("forwards a caller-supplied AbortSignal and owns no timeout", async () => {
    const fetchImpl = fakeFetch({ body: legacyQuoteResponse });
    const controller = new AbortController();

    await fetchPricingQuote(payload, {
      baseUrl: LEGACY_BASE_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
    });

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBe(controller.signal);
  });

  it("throws a configuration error when the resolved base URL is empty", async () => {
    const fetchImpl = fakeFetch({ body: legacyQuoteResponse });

    await expect(
      fetchPricingQuote(payload, { baseUrl: " ", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Chefmate API URL is not configured.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
