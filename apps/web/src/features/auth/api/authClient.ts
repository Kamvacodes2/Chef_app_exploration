import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { readApiErrorMessage } from "@/lib/apiError";
import { platformRoleSchema } from "@/features/platform/api/platformClient";

const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(platformRoleSchema),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});

const authResponseSchema = z.object({
  data: z.object({ user: authUserSchema }),
});

const AUTH_REQUEST_TIMEOUT_MS = 15_000;
const AUTH_REQUEST_TIMEOUT_MESSAGE = "Chefmate is taking longer than expected. Please try again.";

export type AuthenticatedUser = z.infer<typeof authUserSchema>;

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface CreateCustomerAccountInput extends SignInInput {
  readonly displayName: string;
}

export interface AuthRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export async function signIn(
  input: SignInInput,
  options: AuthRequestOptions = {},
): Promise<AuthenticatedUser> {
  return sendAuthRequest("/api/v1/auth/login", input, options);
}

export async function createCustomerAccount(
  input: CreateCustomerAccountInput,
  options: AuthRequestOptions = {},
): Promise<AuthenticatedUser> {
  return sendAuthRequest("/api/v1/auth/register", input, options);
}

export async function getCurrentUser(
  options: AuthRequestOptions = {},
): Promise<AuthenticatedUser | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(
    fetchImpl,
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/auth/me"),
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return authResponseSchema.parse(await response.json()).data.user;
}

export async function logout(options: AuthRequestOptions = {}): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(
    fetchImpl,
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/auth/logout"),
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }
}
async function sendAuthRequest(
  path: string,
  body: SignInInput | CreateCustomerAccountInput,
  options: AuthRequestOptions,
): Promise<AuthenticatedUser> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(
    fetchImpl,
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), path),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return authResponseSchema.parse(await response.json()).data.user;
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(AUTH_REQUEST_TIMEOUT_MESSAGE);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  return readApiErrorMessage(
    response,
    "Chefmate could not complete this request (" + response.status + ").",
  );
}

function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}
