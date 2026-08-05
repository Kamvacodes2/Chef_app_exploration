import { z } from "zod";

const apiErrorResponseSchema = z.object({
  error: z
    .union([z.string(), z.object({ code: z.string().optional(), message: z.string().optional() })])
    .optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

export interface ApiErrorDetails {
  readonly code?: string;
  readonly message: string;
}

export class ChefmateApiError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(status: number, details: ApiErrorDetails) {
    super(details.message);
    this.name = "ChefmateApiError";
    this.status = status;
    if (details.code) this.code = details.code;
  }
}

export async function readApiErrorDetails(
  response: Response,
  fallback: string,
): Promise<ApiErrorDetails> {
  try {
    const parsed = apiErrorResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { message: fallback };
    const nestedCode =
      parsed.data.error && typeof parsed.data.error !== "string"
        ? parsed.data.error.code
        : undefined;
    const message =
      parsed.data.message ??
      (typeof parsed.data.error === "string" ? parsed.data.error : parsed.data.error?.message) ??
      fallback;
    const code = parsed.data.code ?? nestedCode;
    return code ? { code, message } : { message };
  } catch {
    return { message: fallback };
  }
}

export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  return (await readApiErrorDetails(response, fallback)).message;
}
