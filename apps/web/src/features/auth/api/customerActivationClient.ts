import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { readApiErrorMessage } from "@/lib/apiError";

const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(z.string()),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});

const responseSchema = z.object({ data: z.object({ user: userSchema }) });

export type ActivatedCustomer = z.infer<typeof userSchema>;

export interface CustomerActivationRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export async function consumeCustomerActivation(
  token: string,
  options: CustomerActivationRequestOptions = {},
): Promise<ActivatedCustomer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/auth/customer-activation"),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
  );
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "This activation link could not be used."));
  }
  return responseSchema.parse(await response.json()).data.user;
}

export async function setCustomerPassword(
  password: string,
  options: CustomerActivationRequestOptions = {},
): Promise<ActivatedCustomer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    apiUrl(options.baseUrl ?? getChefmateApiUrl(), "/api/v1/auth/password"),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    },
  );
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Chefmate could not save your password."));
  }
  return responseSchema.parse(await response.json()).data.user;
}

function apiUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (!base) throw new Error("Chefmate API URL is not configured.");
  return base + path;
}
