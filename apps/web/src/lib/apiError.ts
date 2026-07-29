import { z } from "zod";

const apiErrorResponseSchema = z.object({
  error: z.union([z.string(), z.object({ message: z.string().optional() })]).optional(),
  message: z.string().optional(),
});

export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const parsed = apiErrorResponseSchema.safeParse(await response.json());
    if (!parsed.success) return fallback;
    if (parsed.data.message) return parsed.data.message;
    if (typeof parsed.data.error === "string") return parsed.data.error;
    return parsed.data.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
