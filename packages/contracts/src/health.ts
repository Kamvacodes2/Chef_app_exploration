import { z } from "zod";

/**
 * Liveness and readiness contracts.
 *
 * Liveness answers "is this process still running the event loop" and must not
 * touch a dependency — otherwise a database blip restarts healthy containers.
 * Readiness answers "should this instance receive traffic" and therefore does
 * check the dependencies the instance cannot serve without.
 */

export const livenessSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
  uptimeSeconds: z.number().nonnegative(),
});
export type Liveness = z.infer<typeof livenessSchema>;

export const readinessCheckStatuses = ["pass", "fail"] as const;

export const readinessCheckSchema = z.object({
  name: z.string().min(1),
  status: z.enum(readinessCheckStatuses),
  durationMs: z.number().nonnegative(),
  /** Safe, non-sensitive reason. Present only when `status` is `fail`. */
  detail: z.string().optional(),
});
export type ReadinessCheck = z.infer<typeof readinessCheckSchema>;

export const readinessSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  service: z.string().min(1),
  checks: z.array(readinessCheckSchema),
});
export type Readiness = z.infer<typeof readinessSchema>;
