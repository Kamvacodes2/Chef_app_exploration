import { pino, type Logger, type LoggerOptions } from "pino";
import { getCorrelationContext } from "./correlation.js";
import { redact, SENSITIVE_FIELD_NAMES, REDACTED } from "./redaction.js";

export type { Logger } from "pino";

export interface CreateLoggerOptions {
  readonly name: string;
  readonly level?: string;
  readonly destination?: NodeJS.WritableStream;
  readonly base?: Record<string, unknown>;
}

/** Pino `redact` paths built from the shared sensitive-field list. */
function pinoRedactPaths(): string[] {
  const paths: string[] = [];
  for (const field of SENSITIVE_FIELD_NAMES) {
    paths.push(field, `*.${field}`, `*.*.${field}`);
  }
  paths.push('req.headers["authorization"]', 'req.headers["cookie"]', 'res.headers["set-cookie"]');
  return paths;
}

/**
 * Builds the single logger used by every process.
 *
 * Three guarantees are wired in here rather than left to call sites:
 * - the active correlation id is attached to every line automatically;
 * - sensitive keys are removed by pino's own redactor;
 * - remaining values are scrubbed for secret-shaped substrings.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const loggerOptions: LoggerOptions = {
    name: options.name,
    level: options.level ?? "info",
    base: { service: options.name, ...options.base },
    redact: { paths: pinoRedactPaths(), censor: REDACTED },
    mixin() {
      const context = getCorrelationContext();
      return context === undefined ? {} : { correlationId: context.correlationId };
    },
    formatters: {
      level: (label) => ({ level: label }),
      log: (object) => redact(object) as Record<string, unknown>,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  return options.destination === undefined
    ? pino(loggerOptions)
    : pino(loggerOptions, options.destination);
}
