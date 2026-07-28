# ADR-0009 — Chef-safe, Rand-only read models enforced by the API

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-28 |
| Step | S01 |
| Blueprint sources | §1.5, §4.2, §6.4, §9.3, §11, §18, `D006`, `D008` |
| Implemented by | S09 (chef portal), enforced in every step that adds a chef-facing surface |

## Context

Outcome §1.5 is absolute: chef-facing screens, APIs, emails, WhatsApps,
notifications, downloads, and exports **never** disclose a percentage, a platform
share, or percentage language. §4.2 turns this into five invariants, of which
§4.2.4 is the architectural one: *the API, not CSS or UI hiding, enforces the
projection.*

Internally the system computes with basis points: `D006` allocates 6,500 basis
points to chef liability with the exact integer-cent remainder to the platform, and
`D008` labels 35% as "platform allocation" — an internal accounting rule only. The
risk is that the internal number travels outward by accident: an over-broad DTO, a
reused admin finance object, a debug field, an export column, or a template string.

There is no chef portal in the codebase today, so this decision is made **before**
the first chef surface exists rather than retrofitted.

## Decision

1. **Chef DTOs are allow-lists, not filtered admin objects.** A chef response is
   constructed from an explicit chef-facing type. No chef endpoint reuses the admin
   finance DTO (§6.4).
2. **Permitted money fields only:** `offered_amount_cents`, `earned_amount_cents`,
   `paid_amount_cents`, and their formatted Rand equivalents (§4.2.1).
3. **Forbidden in any chef-reachable payload:** allocation rates, basis points,
   platform amounts, gross customer totals, processor fees, internal margin
   (§4.2.2).
4. **Forbidden in any chef-reachable copy:** `%`, "percent", "percentage",
   "commission split", "platform share", "65/35" (§4.2.3).
5. **Enforcement is server-side and total.** It applies identically to JSON, email,
   WhatsApp templates, SSE offer popups (§11), page text, downloads, and exports.
   CSS hiding, client-side filtering, and "the UI doesn't render it" are not
   enforcement.
6. **Automated scanning is a release gate.** Contract snapshot tests scan chef JSON,
   email, WhatsApp, exports, and page text for the forbidden fields and words
   (§4.2.5, §18). A new chef surface without a scan is an incomplete surface.
7. **The offer projection is the canonical example** (§6.4): booking reference,
   schedule, service area, meal and side and dessert names,
   `offered_amount_cents`, `offered_amount_display`, `expires_at` — and nothing else.
8. **Amounts come from stored snapshots**, not recomputation, so a chef amount can
   never be back-derived from a rate at read time (ADR-0004).

## Consequences

- **Positive:** the confidentiality guarantee is a property of the system, not of
  reviewer vigilance. A scanner catches the regression class that code review
  reliably misses — a copied template or a new export column.
- **Positive:** because chef amounts are read from immutable snapshots, a later
  allocation-policy change cannot alter what a chef was already offered, which also
  supports `D007`.
- **Positive:** it composes with ADR-0005: the chef transfer amount comes from the
  chef snapshot, so the settlement gross and processor fee never need to be in
  scope of a chef-facing calculation.
- **Negative:** duplicate-looking DTOs. A chef booking view and an admin booking
  view will share field names but must not share a type. This is deliberate
  duplication and must be defended in review against "DRY" refactors — collapsing
  them is precisely the failure mode §4.2.4 anticipates.
- **Negative:** the forbidden-word scan will produce false positives (a chef
  discount notice, a "100% cotton apron" in a marketing template). The scan must be
  scoped to chef-reachable channels with an explicit, audited allow-list for
  approved exceptions, or teams will disable it.
- **Negative:** debugging chef-side issues is harder because the diagnostic fields
  an engineer wants are exactly the forbidden ones. Correlation IDs plus
  admin-side inspection replace them.
- **Negative:** every new chef surface adds scanner surface; the cost is ongoing,
  not one-off.

## Alternatives considered

- **Filter forbidden fields out of a shared DTO at serialization time.** Rejected:
  a deny-list fails open. A newly added internal field is exposed until someone
  remembers to deny it; an allow-list fails closed.
- **Hide the values in the chef UI.** Explicitly rejected by §4.2.4 — the data would
  still be in the JSON payload, visible in devtools, and in any export.
- **Show chefs the percentage "for transparency".** Rejected by §1.5 and §4.2.3;
  this is a product decision, not an engineering one, and `D008` notes a 35%
  allocation is not accounting profit and would in fact mislead.
- **Rely on RLS alone.** Rejected: RLS controls which *rows* a role may read, not
  which *columns and derived values* appear in a projection. Both are needed
  (ADR-0003).

## Supersession

Superseded only by a business-owner decision under §22 to disclose allocation
information to chefs, which would also require re-deciding §1.5 and §4.2 and
rewriting the scanner rules. Adding a new permitted chef money field is an
amendment to clause 2, not a supersession, and must be accompanied by an updated
scanner allow-list and fixtures.
