import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAvailabilityForDate } from "@/features/order-flow/api/availabilityClient";
import { fakeResponse, wireRequest } from "./support/fakeFetch";
import { LEGACY_BASE_URL, legacyAvailabilityResponse } from "./support/fixtures";

/**
 * Legacy contract 7: GET /api/v1/availability/slots?date=YYYY-MM-DD.
 *
 * Provider status: consumer expectation only (D001). This client has no
 * injectable fetch or base URL, so the global fetch and the public environment
 * variable are stubbed. Availability is advisory today: ScheduleSelect seeds a
 * local rule first and swallows any failure (characterized separately below).
 */
describe("legacy contract: availability slots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function stubEnvironment(baseUrl: string, response: Response): ReturnType<typeof vi.fn> {
    vi.stubEnv("NEXT_PUBLIC_CHEFMATE_API_URL", baseUrl);
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("pins the availability request wire shape", async () => {
    const fetchMock = stubEnvironment(LEGACY_BASE_URL, fakeResponse({ body: legacyAvailabilityResponse }));

    await fetchAvailabilityForDate("2026-08-03");

    expect(wireRequest(fetchMock)).toMatchInlineSnapshot(`
      {
        "body": null,
        "credentials": "include",
        "hasAbortSignal": false,
        "headers": null,
        "method": "GET",
        "origin": "http://chefmate-api.test",
        "pathname": "/api/v1/availability/slots",
        "search": "?date=2026-08-03",
      }
    `);
  });

  it("forwards a caller-supplied AbortSignal instead of owning a timeout", async () => {
    const fetchMock = stubEnvironment(LEGACY_BASE_URL, fakeResponse({ body: legacyAvailabilityResponse }));
    const controller = new AbortController();

    await fetchAvailabilityForDate("2026-08-03", controller.signal);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBe(controller.signal);
  });

  it("returns only the slots array from the response envelope", async () => {
    stubEnvironment(LEGACY_BASE_URL, fakeResponse({ body: legacyAvailabilityResponse }));

    await expect(fetchAvailabilityForDate("2026-08-03")).resolves.toMatchInlineSnapshot(`
      [
        {
          "available": true,
          "label": "9:00 AM",
          "period": "morning",
          "time": "09:00",
        },
        {
          "available": false,
          "label": "2:00 PM",
          "period": "afternoon",
          "time": "14:00",
        },
        {
          "available": true,
          "label": "6:00 PM",
          "period": "evening",
          "time": "18:00",
        },
      ]
    `);
  });

  it("uses a flat status-only error message and never reads the error body", async () => {
    stubEnvironment(LEGACY_BASE_URL, fakeResponse({ status: 502, body: { message: "ignored" } }));

    await expect(fetchAvailabilityForDate("2026-08-03")).rejects.toThrow(
      "Chefmate availability request failed (502)",
    );
  });

  it("rejects a slot outside the legacy period or time format", async () => {
    stubEnvironment(
      LEGACY_BASE_URL,
      fakeResponse({
        body: { data: { date: "2026-08-03", slots: [{ period: "midnight", time: "9:00", label: "9", available: true }] } },
      }),
    );

    await expect(fetchAvailabilityForDate("2026-08-03")).rejects.toThrow();
  });

  it("encodes the date argument", async () => {
    const fetchMock = stubEnvironment(LEGACY_BASE_URL, fakeResponse({ body: legacyAvailabilityResponse }));

    await fetchAvailabilityForDate("2026-08-03").catch(() => undefined);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://chefmate-api.test/api/v1/availability/slots?date=2026-08-03",
    );
  });
});
