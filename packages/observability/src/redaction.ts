/**
 * Redaction rules for structured logs (blueprint sections 4.3.3, 4.3.6, 15.2).
 *
 * Two independent layers are applied, because either one alone is insufficient:
 *
 * 1. **Key-based** redaction removes well-known sensitive field names wherever
 *    they appear in a log object.
 * 2. **Value-based** scrubbing catches secrets that arrive inside an otherwise
 *    innocent string — a connection string embedded in an error message, an
 *    `Authorization` header echoed back by a provider, a bare card/account
 *    number in free text.
 */

export const REDACTED = "[REDACTED]";

/** Field names that must never appear in a log line with their real value. */
export const SENSITIVE_FIELD_NAMES = [
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "token",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "sessionSecret",
  "magicLinkToken",
  "otp",
  "secret",
  "clientSecret",
  "apiKey",
  "authorization",
  "cookie",
  "setCookie",
  "signature",
  "accountNumber",
  "bankAccountNumber",
  "iban",
  "cardNumber",
  "cvv",
  "pan",
  "idNumber",
  "databaseUrl",
  "connectionString",
  "exactAddress",
  "addressLine1",
  "addressLine2",
  "latitude",
  "longitude",
] as const;

const SENSITIVE_KEY_SET = new Set<string>(SENSITIVE_FIELD_NAMES.map((name) => name.toLowerCase()));

/** Also match snake_case / kebab-case spellings of the same field names. */
function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[-_]/g, "");
  for (const candidate of SENSITIVE_KEY_SET) {
    if (normalised === candidate.replace(/[-_]/g, "")) {
      return true;
    }
  }
  return false;
}

interface ValueRule {
  readonly name: string;
  readonly pattern: RegExp;
  readonly replacement: string;
}

const VALUE_RULES: readonly ValueRule[] = [
  {
    name: "postgres-connection-string",
    pattern: /\bpostgres(?:ql)?:\/\/[^\s"'<>]+/gi,
    replacement: "postgres://[REDACTED]",
  },
  {
    name: "authorization-header-value",
    pattern: /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replacement: `$1 ${REDACTED}`,
  },
  {
    name: "jwt-like",
    pattern: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g,
    replacement: REDACTED,
  },
  {
    name: "paystack-key",
    pattern: /\b[sp]k_(?:test|live)_[A-Za-z0-9]{8,}\b/gi,
    replacement: REDACTED,
  },
  {
    name: "long-digit-run",
    // Bank account / card / national-identifier shaped runs of digits.
    pattern: /\b\d{9,}\b/g,
    replacement: REDACTED,
  },
];

/** Scrubs secret-shaped substrings out of a single string value. */
export function scrubString(value: string): string {
  let output = value;
  for (const rule of VALUE_RULES) {
    output = output.replace(rule.pattern, rule.replacement);
  }
  return output;
}

const MAX_DEPTH = 8;

/**
 * Recursively redacts an arbitrary log payload.
 *
 * Cycles are collapsed to `"[Circular]"`, and depth is bounded, so a hostile or
 * accidental object graph cannot hang the logger.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return scrubString(value);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return "[Truncated]";
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1, seen));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message),
      stack: value.stack === undefined ? undefined : scrubString(value.stack),
    };
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1, seen);
  }
  return output;
}
