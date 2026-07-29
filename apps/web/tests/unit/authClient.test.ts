import { describe, expect, it, vi } from "vitest";
import { createCustomerAccount, getCurrentUser, signIn } from "@/features/auth/api/authClient";

const authenticatedUser = {
  id: "user-1",
  email: "sam@example.test",
  displayName: "Sam",
  roles: ["CUSTOMER"],
  status: "ACTIVE",
  emailVerifiedAt: null,
  createdAt: "2026-07-26T10:00:00.000Z",
};

describe("authClient", () => {
  it("sends login requests with the browser session cookie enabled", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user: authenticatedUser } }),
    }) as unknown as typeof fetch;

    await expect(
      signIn(
        { email: authenticatedUser.email, password: "A-strong-password-2026" },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).resolves.toMatchObject({ email: authenticatedUser.email });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: authenticatedUser.email,
          password: "A-strong-password-2026",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("reads the signed-in customer from the browser session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { user: authenticatedUser } }),
    }) as unknown as typeof fetch;

    await expect(getCurrentUser({ baseUrl: "http://api.test", fetchImpl })).resolves.toMatchObject({
      email: authenticatedUser.email,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/me",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("treats an absent browser session as a guest", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;

    await expect(getCurrentUser({ baseUrl: "http://api.test", fetchImpl })).resolves.toBeNull();
  });

  it("creates a customer account and preserves useful API errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: "email_in_use", message: "An account with this email already exists" },
      }),
    }) as unknown as typeof fetch;

    await expect(
      createCustomerAccount(
        { displayName: "Sam", email: authenticatedUser.email, password: "A-strong-password-2026" },
        { baseUrl: "http://api.test", fetchImpl },
      ),
    ).rejects.toThrow("An account with this email already exists");
  });
});
