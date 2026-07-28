# Legacy browser API contract inventory

Baseline commit: `089cfda` (S00 green baseline). Captured in step **S01**.
No runtime code was changed to produce this document.

## Provider status: none of these contracts has a provider

There is no Chefmate backend. Verified in S01:

- `git remote -v` resolves to this repository only
  (`https://github.com/Kamvacodes2/Chef_app_exploration.git`); there is no sibling
  or remote backend project.
- `.env.local` points `NEXT_PUBLIC_CHEFMATE_API_URL` at `http://127.0.0.2:3004`, a
  deliberately unroutable loopback address matching `tests/unit/lib.test.ts:37`.

Therefore **every row below is a consumer expectation requiring provider
confirmation**, not a characterized provider behaviour. Only the browser-side
request builder, response parser, and error handling are characterizable today, and
that is exactly what the fixtures under `tests/contract/legacy/` pin. Locked default
`D001` holds: the backend is built fresh in this repository.

## Base URL resolution — the cutover boundary

`src/lib/env.ts`:

| Function | Behaviour |
|---|---|
| `resolveChefmateApiUrl` (lines 20-27) | Trims whitespace and exactly **one** trailing slash. Throws `NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production.` when unset in production. Defaults to `http://localhost:3001` otherwise. |
| `resolveCatalogApiUrl` (lines 42-48) | Uses `NEXT_PUBLIC_MEALS_API_URL ?? NEXT_PUBLIC_CHEFMATE_API_URL`; same trim, same production throw with both variable names, same development default. |

Fixture: `tests/contract/legacy/baseUrlResolution.contract.test.ts`.

This single environment variable **is** the cutover boundary. When the API lands in
`apps/api` (S02), pointing this variable at it is the only browser-side change
required, because every legacy client already resolves through these two functions.

## Contract inventory

| # | Contract | Method + path | Client | Auth / headers | Fixture |
|---|---|---|---|---|---|
| 1 | Login | `POST /api/v1/auth/login` | `src/features/auth/api/authClient.ts:39` | `credentials: include`, JSON | `auth.contract.test.ts` |
| 2 | Register | `POST /api/v1/auth/register` | `authClient.ts:46` | `credentials: include`, JSON | `auth.contract.test.ts` |
| 3 | Current user | `GET /api/v1/auth/me` | `authClient.ts:51` | `credentials: include`; **401 → `null`, not an error** | `auth.contract.test.ts` |
| 4 | Catalog categories | `GET {catalogBase}/categories` | `src/data/repository/HttpMealsRepository.ts:44` | none | `catalog.contract.test.ts` |
| 5 | Catalog meals | `GET {catalogBase}/meals`, `…/meals?category=` | `HttpMealsRepository.ts:55,60` | none | `catalog.contract.test.ts` |
| 6 | Catalog meal by id | `GET {catalogBase}/meals/{id}` | `HttpMealsRepository.ts:65` | none; **404 → `undefined`** | `catalog.contract.test.ts` |
| 7 | Availability slots | `GET /api/v1/availability/slots?date=YYYY-MM-DD` | `src/features/order-flow/api/availabilityClient.ts:27` | `credentials: include` | `availability.contract.test.ts`, `availabilityFallback.contract.test.ts` |
| 8 | Booking quote | `POST /api/v1/booking-requests/quote` | `src/features/order-flow/api/pricingQuoteClient.ts:96` | `credentials: include`, JSON | `pricingQuote.contract.test.ts` |
| 9 | Booking submission | `POST /api/v1/booking-requests` | `src/features/order-flow/api/bookingRequestClient.ts:176` | `credentials: include`, JSON, **`Idempotency-Key`** | `bookingRequest.contract.test.ts` |
| 10 | Survey retrieval | `GET /api/v1/surveys/{token}` | `src/features/survey/SurveyPage.tsx:28,92` | **no credentials**; token in path | `survey.contract.test.ts` |
| 11 | Survey submission | `POST /api/v1/surveys/{token}` | `SurveyPage.tsx:146` | JSON, **no credentials** | `survey.contract.test.ts` |

All fixtures live in `tests/contract/legacy/` and run via
`pnpm exec vitest run --config vitest.contract.config.ts`.

## Load-bearing legacy quirks (pinned, not fixed)

### Q1 — Path construction differs per client

`HttpMealsRepository.endpoint` (lines 71-76) branches on whether the resolved base
URL ends in `/catalog`: if so it appends the path directly, otherwise it inserts
`/api/v1/catalog`. **Every other client** uses a locally duplicated `apiUrl` helper
(three separate copies, in `authClient.ts:99`, `pricingQuoteClient.ts:108`,
`bookingRequestClient.ts:193`) that trims and throws
`Chefmate API URL is not configured.` on an empty base. The survey page has a fourth
variant, `surveyUrl`, with no guard at all.

### Q2 — Timeouts exist only on auth

`authClient` wraps every call in a 15000 ms `AbortController`; an abort becomes
`Chefmate is taking longer than expected. Please try again.` Catalog, availability,
quote, booking submission, and survey have **no timeout**. Availability, quote, and
survey instead accept or create a caller-supplied `AbortSignal`.

### Q3 — Error message shapes are inconsistent

| Client | Failure message |
|---|---|
| Auth (1-3) | `readApiErrorMessage` (`src/lib/apiError.ts`): prefers `message`, then a string `error`, then `error.message`, else `Chefmate could not complete this request (<status>).` |
| Catalog (4-6) | Flat `Chefmate catalog request failed (<status>)` — body never read |
| Availability (7) | Flat `Chefmate availability request failed (<status>)` — body never read |
| Quote (8) | Flat `Chefmate pricing quote failed (<status>)` — body never read |
| Booking submission (9) | `readApiErrorMessage` with fallback `Chefmate booking request failed (<status>)` |
| Survey (10-11) | **All** retrieval failures — transport error, non-2xx, and a non-`PENDING` status — collapse to `This survey link is unavailable or has expired.` Submission failure is `We could not save your feedback. Please try again.` |

### Q4 — Availability is advisory and its failure is silently swallowed

`src/features/order-flow/components/ScheduleSelect.tsx:104-119` seeds
`localAvailability(...)` first, overwrites it on fetch success, and no-ops on
`.catch(() => {})`. A failed availability call surfaces no error to the customer and
leaves the local same-day rule in force. Pinned in
`availabilityFallback.contract.test.ts`. Making availability authoritative is later
work, not an S01 fix.

### Q5 — Money is integer cents everywhere **except** the quote's main item

Every cents field is `z.number().int().nonnegative()`. However `pricingItemSchema`
(`pricingQuoteClient.ts:7-13`) requires `priceCents` for **every** item kind,
including `kind: "main"`. This directly contradicts blueprint invariant §4.1.2 and
locked default `D005` (a main selection never changes the quote; main items have no
price field). **Recorded as a legacy defect requiring S04 resolution** — see
[ADR-0004](../../adr/0004-integer-cent-immutable-versioned-pricing.md). Not fixed in S01.

### Q6 — Booking submission normalizes on the client

`bookingRequestClient.ts:141-165`: trims address parts and contact name, lowercases
the email, and rewrites the phone — `00…` → `+…`, leading `0` → `+27…` — then
validates against `^\+?[1-9]\d{7,14}$`. `bookingRequestFingerprint` is
`JSON.stringify(payload)`, so it is **key-order dependent** and is not a
canonicalized hash. Pinned in `bookingRequest.contract.test.ts`.

### Q7 — Legacy payment and status vocabulary is unrelated to the target model

The booking response carries `payment.method: "BANK_TRANSFER"` with plaintext bank
instruction fields (`bankName`, `branchName`, `branchCode`, `accountHolder`,
`accountNumber`, `accountType`, `paymentReference`) and an 8-value status enum
(`REQUESTED`, `NEEDS_REVIEW`, `CONFIRMED`, `AWAITING_CHEF`, `CHEF_MATCHED`,
`EN_ROUTE`, `CANCELLED`, `COMPLETED`). None of these map to the booking or funding
state machines in blueprint §7.3. See
[ADR-0005](../../adr/0005-paystack-collect-then-transfer.md).
All bank values used in fixtures are fabricated; no real account data appears
anywhere in this repository.

### Q8 — Pre-rename vocabulary is live on the wire

`COOK` is a first-class role value in `authClient.ts:9` and in `SurveyPage.tsx`'s
`SurveyRole`; there is **no** `COOK`→`CHEF` normalization in `src/`. `full-house` is
a live plan id in `src/features/plans/planCatalog.ts` (`priceCents: 505500`) typed
into the plan-id literal union used by contracts 8 and 9; there is **no** `PREMIUM`
code and no alias table. See
[ADR-0008](../../adr/0008-cook-to-chef-and-full-house-to-premium-compatibility.md).

## Compatibility expectation for the new API

The API built from S02 onward must, during the compatibility window (§17):

1. Serve all eleven paths at the same methods and shapes listed above.
2. Keep `401` on `GET /api/v1/auth/me` meaning "guest".
3. Keep `404` on a single catalog meal meaning "not found", not an error.
4. Honour `Idempotency-Key` on `POST /api/v1/booking-requests`.
5. Accept `COOK` and `full-house` on input while emitting `CHEF` and `PREMIUM`.
6. Return integer-cent money on every money field.
7. Return error bodies whose `message` / `error` / `error.message` shape satisfies
   `readApiErrorMessage` for contracts 1-3 and 9.
