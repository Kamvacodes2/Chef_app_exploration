import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Request-scoped correlation context.
 *
 * The API opens a context per inbound request; the worker opens one per claimed
 * outbox row using the `correlation_id` persisted on that row. That is how a
 * single logical operation stays traceable across the API -> outbox -> worker
 * hop described in blueprint section 5.3.
 */
export interface CorrelationContext {
  readonly correlationId: string;
  /** Set when the current unit of work descends from another one. */
  readonly causationId?: string;
}

/** Canonical inbound/outbound header name for the correlation identifier. */
export const CORRELATION_ID_HEADER = "x-correlation-id";

const storage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Accepts an externally supplied correlation id only when it is a plausible,
 * bounded, log-safe token. Anything else is replaced with a fresh UUID so a
 * caller cannot inject newlines or unbounded text into structured logs.
 */
const SAFE_CORRELATION_ID = /^[A-Za-z0-9_.:-]{8,128}$/;

export function isSafeCorrelationId(value: unknown): value is string {
  return typeof value === "string" && SAFE_CORRELATION_ID.test(value);
}

export function newCorrelationId(): string {
  return randomUUID();
}

/** Returns `candidate` when it is safe to reuse, otherwise a fresh identifier. */
export function normaliseCorrelationId(candidate: unknown): string {
  return isSafeCorrelationId(candidate) ? candidate : newCorrelationId();
}

export function runWithCorrelation<T>(context: CorrelationContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
