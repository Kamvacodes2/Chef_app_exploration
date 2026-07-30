import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAvailabilityForDate } from "@/features/order-flow/api/availabilityClient";

const originalFetch = globalThis.fetch;

describe("availabilityClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches availability from the configured Chefmate API URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFMATE_API_URL", "http://api.test/");
    const signal = new AbortController().signal;
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          date: "2026-08-15",
          slots: [{ period: "evening", time: "18:30", label: "Dinner", available: true }],
        },
      }),
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchImpl;

    await expect(fetchAvailabilityForDate("2026-08-15", signal)).resolves.toEqual([
      { period: "evening", time: "18:30", label: "Dinner", available: true },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/availability/slots?date=2026-08-15",
      expect.objectContaining({ method: "GET", credentials: "include", signal }),
    );
  });

  it("rejects non-OK availability responses", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFMATE_API_URL", "http://api.test");
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;

    await expect(fetchAvailabilityForDate("2026-08-15")).rejects.toThrow(
      "Chefmate availability request failed (503)",
    );
  });

  it("requires an explicit Chefmate API URL in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFMATE_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    await expect(fetchAvailabilityForDate("2026-08-15")).rejects.toThrow(
      "NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production",
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
