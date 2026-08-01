import { describe, expect, it, vi } from "vitest";
import { createCustomerAccount, getCurrentUser, signIn } from "@/features/auth/api/authClient";
import { fakeFetch, wireRequest } from "./support/fakeFetch";
import { LEGACY_BASE_URL, legacyAuthResponse, legacyAuthUser } from "./support/fixtures";

/**
 * Legacy contracts 1-3: POST /api/v1/auth/login, POST /api/v1/auth/register,
 * GET /api/v1/auth/me.
 *
 * Provider status: consumer expectation only. No Chefmate backend exists to
 * characterize server-side behaviour against (D001), so these fixtures pin the
 * browser-side request builder, response parser, and error handling exactly as
 * they behave at commit 089cfda.
 */
describe("legacy contract: authentication", () => {
  const credentials = { email: legacyAuthUser.email, password: "Synthetic-Test-Password-2026" };

  it("pins the login request wire shape", async () => {
    const fetchImpl = fakeFetch({ body: legacyAuthResponse });

    await signIn(credentials, {
      baseUrl: LEGACY_BASE_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(wireRequest(fetchImpl)).toMatchInlineSnapshot(`
      {
        "body": {
          "email": "thandi.customer@example.test",
          "password": "Synthetic-Test-Password-2026",
        },
        "credentials": "include",
        "hasAbortSignal": true,
        "headers": {
          "Content-Type": "application/json",
        },
        "method": "POST",
        "origin": "http://chefmate-api.test",
        "pathname": "/api/v1/auth/login",
        "search": "",
      }
    `);
  });

  it("pins the register request wire shape, including the extra displayName field", async () => {
    const fetchImpl = fakeFetch({ body: legacyAuthResponse });

    await createCustomerAccount(
      { ...credentials, displayName: legacyAuthUser.displayName },
      { baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    const request = wireRequest(fetchImpl);
    expect(request.pathname).toBe("/api/v1/auth/register");
    expect(request.body).toEqual({ ...credentials, displayName: legacyAuthUser.displayName });
  });

  it("pins the parsed authenticated-user projection, normalizing legacy COOK to CHEF", async () => {
    expect(legacyAuthUser.roles).toContain("COOK");

    const fetchImpl = fakeFetch({ body: legacyAuthResponse });

    const user = await getCurrentUser({
      baseUrl: LEGACY_BASE_URL,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(user).toMatchInlineSnapshot(`
      {
        "createdAt": "2026-06-01T08:00:00.000Z",
        "displayName": "Thandi Customer",
        "email": "thandi.customer@example.test",
        "emailVerifiedAt": "2026-07-01T08:00:00.000Z",
        "id": "usr_0000000000000001",
        "roles": [
          "CUSTOMER",
          "CHEF",
        ],
        "status": "ACTIVE",
      }
    `);
    expect(user?.roles).toContain("CHEF");
    expect(user?.roles).not.toContain("COOK");
  });

  it("treats 401 on the session probe as a guest rather than an error", async () => {
    const fetchImpl = fakeFetch({ status: 401 });

    await expect(
      getCurrentUser({ baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).resolves.toBeNull();
  });

  it("propagates a non-401 session-probe failure as an error", async () => {
    const fetchImpl = fakeFetch({
      status: 503,
      body: { message: "Chefmate is offline for maintenance" },
    });

    await expect(
      getCurrentUser({ baseUrl: LEGACY_BASE_URL, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Chefmate is offline for maintenance");
  });

  it("pins readApiErrorMessage precedence: message, then string error, then error.message, then fallback", async () => {
    const cases = [
      {
        body: { message: "Top level message wins", error: "ignored" },
        expected: "Top level message wins",
      },
      { body: { error: "String error is second" }, expected: "String error is second" },
      {
        body: { error: { message: "Nested error message is third" } },
        expected: "Nested error message is third",
      },
      { body: { error: {} }, expected: "Chefmate could not complete this request (409)." },
      { bodyThrows: true, expected: "Chefmate could not complete this request (409)." },
    ] as const;

    for (const testCase of cases) {
      const fetchImpl = fakeFetch({ status: 409, ...testCase });
      await expect(
        signIn(credentials, {
          baseUrl: LEGACY_BASE_URL,
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
      ).rejects.toThrow(testCase.expected);
    }
  });

  it("rejects an unparseable success body instead of returning a partial user", async () => {
    const fetchImpl = fakeFetch({ body: { data: { user: { id: "usr_1" } } } });

    await expect(
      signIn(credentials, {
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow();
  });

  it("is the only client group with an internal request timeout (15000ms)", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );

      const pending = signIn(credentials, {
        baseUrl: LEGACY_BASE_URL,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      const assertion = expect(pending).rejects.toThrow(
        "Chefmate is taking longer than expected. Please try again.",
      );

      await vi.advanceTimersByTimeAsync(15_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws a configuration error when the resolved base URL is empty", async () => {
    const fetchImpl = fakeFetch({ body: legacyAuthResponse });

    await expect(
      signIn(credentials, { baseUrl: "   ", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Chefmate API URL is not configured.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
