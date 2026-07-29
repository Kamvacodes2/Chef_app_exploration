import { z } from "zod";

/**
 * API-wide response envelope (blueprint section 9.1).
 *
 * Success is `{ data, meta }`; failure is a stable problem object carrying a
 * safe code/message, optional field errors, the request id and an explicit
 * retryability flag. Stack traces and provider response bodies never cross this
 * boundary.
 */

export const responseMetaSchema = z.object({
  requestId: z.string().min(1),
  correlationId: z.string().min(1),
});
export type ResponseMeta = z.infer<typeof responseMetaSchema>;

export function successEnvelopeSchema<TData extends z.ZodTypeAny>(data: TData) {
  return z.object({ data, meta: responseMetaSchema });
}

export const fieldErrorSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
});
export type FieldError = z.infer<typeof fieldErrorSchema>;

export const problemSchema = z.object({
  /** Stable machine-readable identifier, e.g. `VALIDATION_FAILED`. */
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  /** Human-safe summary. Never contains provider text or a stack trace. */
  message: z.string().min(1),
  status: z.number().int().min(400).max(599),
  fieldErrors: z.array(fieldErrorSchema).optional(),
  retryable: z.boolean(),
  meta: responseMetaSchema,
});
export type Problem = z.infer<typeof problemSchema>;
