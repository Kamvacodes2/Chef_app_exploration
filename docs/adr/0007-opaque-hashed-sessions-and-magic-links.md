# ADR-0007 — Opaque hashed server sessions and single-use hashed magic links

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §2.2, §4.3.1, §4.3.4, §4.3.10, §15.1, §15.2, `D016`, `D018`, `G009` |
| Implemented by | S03 (identity, sessions, RBAC, purpose tokens, audit) |

## Context

The legacy browser already assumes a **cookie session**: `authClient` sends
`credentials: "include"` on login, register, and `GET /api/v1/auth/me`, stores no
token, and treats `401` on the session probe as "guest" rather than an error
(characterized in `tests/contract/legacy/auth.contract.test.ts`). Availability,
quote, and booking submission also send `credentials: "include"`. Nothing in `src/`
reads or writes a JWT, and nothing touches `localStorage` for auth.

The chef portal is activated by a single-use invitation link (§1.2), and the survey
route is already a tokenized public URL (`GET/POST /api/v1/surveys/{token}`) with no
credentials — the one existing example of a purpose-bound token in the codebase.

§2.2 lists "credentialed session calls" and "the tokenized survey route" as
foundations to preserve.

## Decision

1. **Sessions are opaque and server-side.** The cookie carries a random opaque
   identifier only. The server stores a **hash** of the session secret, never the
   secret itself, along with subject, role/scope, issue and expiry times, and
   device/IP metadata for the revocation matrix.
2. **Cookies are `HttpOnly`, `Secure`, `SameSite`-constrained, and host-scoped.**
   No authentication material is readable by JavaScript and no token is stored in
   `localStorage`, `sessionStorage`, or a URL query string.
3. **Passwords use Argon2id** (`D016`).
4. **Magic links are hashed at rest, single-use, purpose-bound, rate-limited, and
   expiring** (§4.3.4). Invitation URLs put the token only in the **fragment**;
   a `GET` or prefetch never consumes it; the landing page loads no third party and
   removes the fragment immediately; only an explicit `POST` consumes it.
5. **Every protected endpoint authenticates, authorizes by role/scope, and applies a
   subject ownership check** (§4.3.1). Authorization is never inferred from the
   session's mere existence.
6. **Full revocation matrix.** Logout, password change, bank-account change, role
   change, and suspected takeover revoke sessions server-side. Because sessions are
   server-stored, revocation is immediate (§4.3.10).
7. **Role values today are `CUSTOMER`, `COOK`, `ADMIN`, `SUPPORT`.** The canonical
   rename to `CHEF` is decided but not implemented (ADR-0008); S03 must build the
   session and RBAC model against the canonical set with an inbound compatibility
   window, not against `COOK` permanently.

## Consequences

- **Positive:** immediate revocation is possible, which a self-contained JWT cannot
  offer without a second revocation store — and the bank-change and takeover
  requirements in §4.3.10 make immediate revocation mandatory.
- **Positive:** a database leak does not yield usable session secrets, because only
  hashes are stored — the same property as the password and magic-link hashes.
- **Positive:** the existing browser code needs no change at cutover. Every
  credentialed call already works against this model, so S03 is additive.
- **Positive:** fragment-only invitation tokens are not sent to the server on
  navigation, are absent from server logs and `Referer` headers, and survive
  prefetching.
- **Negative:** every authenticated request needs a session lookup. Mitigated by an
  indexed session store and short-lived in-process caching that must respect
  revocation, which is a real correctness risk to test.
- **Negative:** cookie sessions require CSRF defence on state-changing endpoints;
  a bearer-token design would not. This is an accepted trade for revocability.
- **Negative:** stateful sessions couple the API to the database for every request,
  reinforcing ADR-0003's availability profile.
- **Blocked by gates:** `G009` gates broader data-subject, incident, and retention
  launch approval, though it does not gate the S03 schema freeze (that is `G011`).

## Alternatives considered

- **Browser-stored JWT (localStorage or non-`HttpOnly` cookie).** Rejected by
  `D016`. XSS-readable, not revocable before expiry, and incompatible with §4.3.10.
- **Short-lived JWT plus refresh token.** Rejected for v1: it reintroduces a
  server-side revocation store for refresh tokens, i.e. the same statefulness with
  more moving parts and a token still readable by the client.
- **Third-party identity provider (managed auth).** Not rejected on merit, but
  deferred: the chef magic-link flow, purpose-bound tokens, break-glass address
  access, and the audit requirements in §15 are Chefmate-specific and would need
  custom work regardless.
- **Query-parameter invitation tokens.** Explicitly rejected by §4.3.4 — they leak
  through logs, `Referer`, browser history, and prefetch.

## Supersession

Superseded by an approved §22 mutation, for example adopting an external identity
provider. Any successor must preserve: no browser-stored token, hashed-at-rest
credentials and tokens, single-use fragment-only magic links, and immediate
server-side revocation. ADR-0008 amends the role vocabulary referenced in clause 7.
