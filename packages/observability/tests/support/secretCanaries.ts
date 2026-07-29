/**
 * Detection canaries for the redaction and security suites.
 *
 * This is the single canonical home for every credential-shaped test literal in
 * the repository. It lives inside `packages/observability` because the log
 * redaction pipeline these values primarily exercise lives there, and because
 * `packages/observability/tests/unit/redaction.test.ts` can then import it with
 * a relative path that stays entirely inside its own package root — ADR-0001
 * rule 5, enforced by `tests/security/dependencyDirection.test.ts`, forbids a
 * relative import escaping that root and would have forced a duplicate copy the
 * other way around.
 *
 * The root-level security suites (`tests/security/secrets.test.ts`,
 * `tests/security/logRedaction.test.ts`) import this file directly. They are the
 * repository's cross-package verification layer, sit outside every package and
 * app, and are not part of any unit that ADR-0001 assigns a dependency
 * direction to — so reaching in here is not a topology violation, and
 * `dependencyDirection.test.ts` (which scans only `packages/*\/{src,tests}` and
 * `apps/*\/src`) does not consider it one.
 *
 * Nothing here is exported from `packages/observability/src` or from any package
 * entry point: these literals are unreachable from runtime code by construction.
 *
 * ============================================================================
 * THIS FILE CONTAINS DELIBERATELY CREDENTIAL-SHAPED STRINGS. NONE OF THEM IS A
 * REAL CREDENTIAL. NONE OF THEM HAS EVER BEEN VALID ANYWHERE.
 * ============================================================================
 *
 * Two mechanisms in this repository exist to stop real secrets from being
 * committed or logged:
 *
 *   1. the repository self-scan in `tests/security/secrets.test.ts`, which
 *      greps every tracked file against `SECRET_RULES`;
 *   2. the log redaction pipeline in `packages/observability/src/redaction.ts`,
 *      asserted by `tests/security/logRedaction.test.ts`.
 *
 * Neither can be tested with a fake that does not look like the real thing. A
 * "secret" that no pattern matches proves nothing: it would pass against a
 * scanner whose every rule had been deleted, and against a redactor that did
 * nothing at all. So the canaries below keep a realistic *shape* on purpose —
 * that shape is the thing under test.
 *
 * Because they keep a realistic shape, the repository's own scanner does find
 * them. They are therefore not hidden from it: each one is registered by exact
 * file path and by SHA-256 of the matched text in
 * `tests/security/secret-canary-allowlist.json`, and
 * `tests/security/secretCanaryAllowlist.test.ts` fails the suite if a canary
 * changes, disappears, or outlives its review date. Suppression here is named,
 * hashed, owned and dated — never a pattern, a directory or a wildcard.
 *
 * Rules for editing this file:
 *
 *   - Never write a value that is, or ever was, live anywhere.
 *   - Prefer the vendor's own published example value where one exists; AWS
 *     documents one, and it is used below.
 *   - Prefer `_test_` over `_live_` key prefixes. The one `_live_` value below
 *     is a *public* key prefix (`pk_`), which is not secret material even in
 *     production, and it exists only so the `live` branch of the scanner's
 *     alternation is proven to still match.
 *   - Never break a value apart with concatenation to hide it from a scanner.
 *     Being visible to scanners is the entire purpose of this file.
 *   - Changing any value here requires updating its SHA-256 in the allowlist,
 *     which is what forces a fresh security review.
 */

/** `-----BEGIN … PRIVATE KEY-----` armour header. Header only; there is no key. */
export const PRIVATE_KEY_BLOCK_CANARY = "-----BEGIN RSA PRIVATE KEY-----";

/** Paystack-style *secret* key shape. Test-mode prefix, obviously synthetic body. */
export const PAYSTACK_SECRET_KEY_CANARY = "sk_test_00000000000000000000EXAMPLE";

/**
 * Paystack-style *public* key shape. `pk_` keys are published to browsers and
 * are not secret material; the `live` prefix is used here solely to keep the
 * `(?:live|test)` alternation in the scanner rule under test.
 */
export const PAYSTACK_PUBLIC_KEY_CANARY = "pk_live_00000000000000000000EXAMPLE";

/** AWS's own documented example access key id. Never valid against any account. */
export const AWS_ACCESS_KEY_ID_CANARY = "AKIAIOSFODNN7EXAMPLE";

/** GitHub personal-access-token shape. All-zero body; fails GitHub's checksum. */
export const GITHUB_TOKEN_CANARY = "ghp_000000000000000000000000000000EXAMPLE";

/** Slack bot-token shape. All-zero segments; never issued by any workspace. */
export const SLACK_TOKEN_CANARY = "xoxb-0000000000-0000000000-000000000000EXAMPLE";

/**
 * JWT shape: `{"alg":"HS256"}` / `{"sub":"123456"}` / the literal ASCII word
 * "signature" in base64url. Unsigned, so it verifies against nothing.
 */
export const JSON_WEB_TOKEN_CANARY = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.c2lnbmF0dXJl";

/** Connection string carrying a non-placeholder password, on a reserved domain. */
export const CONNECTION_STRING_CANARY =
  "postgresql://chefmate:realpassword123@db.example.com:5432/app";

const connectionStringUrl = new URL(CONNECTION_STRING_CANARY);

/**
 * The password and host inside {@link CONNECTION_STRING_CANARY}, parsed from it
 * rather than restated, so a redaction assertion can never drift out of step
 * with the value it is checking.
 */
export const CONNECTION_STRING_CANARY_PASSWORD = connectionStringUrl.password;
export const CONNECTION_STRING_CANARY_HOST = connectionStringUrl.hostname;

/**
 * One canary per rule name in `SECRET_RULES`.
 *
 * `tests/security/secrets.test.ts` asserts this mapping covers every rule and
 * that each named rule matches its own canary, so a rule cannot be quietly
 * neutered — nor a new rule added without a canary to prove it works.
 */
export const CANARY_BY_RULE_NAME: Readonly<Record<string, string>> = {
  "private key block": PRIVATE_KEY_BLOCK_CANARY,
  "paystack-style key": PAYSTACK_SECRET_KEY_CANARY,
  "aws access key id": AWS_ACCESS_KEY_ID_CANARY,
  "github token": GITHUB_TOKEN_CANARY,
  "slack token": SLACK_TOKEN_CANARY,
  "json web token": JSON_WEB_TOKEN_CANARY,
  "connection string with a non-placeholder password": CONNECTION_STRING_CANARY,
};

/**
 * Extra canaries that exercise a *branch* of a rule already covered above,
 * rather than a rule of its own.
 */
export const ADDITIONAL_RULE_BRANCH_CANARIES: readonly string[] = [PAYSTACK_PUBLIC_KEY_CANARY];
