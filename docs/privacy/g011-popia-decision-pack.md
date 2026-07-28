# G011 — POPIA Baseline Decision Pack

**Status: PREPARATORY ONLY. This document does not close `G011`. `G011` remains OPEN until a human Privacy / legal / data-protection owner reviews this pack and formally signs off.**

- **Gate:** `G011` — "Approve POPIA baseline data inventory, lawful bases, minimization, processors/cross-border flows, and retention."
- **Owner:** Privacy / legal / data-protection owner (human, not engineering).
- **Source:** `plans/chefmate-platform-execution-blueprint.md` §17 gate register (line ~781) and `plans/chefmate-platform-progress.md` open-decision/launch-gate register.
- **Blocks:** `S03` schema/contract freeze only. Does **not** block `S02` (platform scaffolding), which proceeds in parallel.
- **Affected acceptance IDs:** `A16`, `A19`, `A20`, `A22` (per blueprint §17 gate table, line 781, and acceptance-criteria table §18).

This pack is prepared by an engineering agent as analysis and options only. Every statement below phrased as a legal conclusion ("this likely requires X under POPIA") is a non-binding engineering read and **must be confirmed by qualified legal counsel** before `G011` is closed. Nothing here should be treated as legal advice or a settled compliance position.

---

## 1. Data inventory (baseline)

Grounded in blueprint §8.2 (Identity, recruitment, onboarding), §8.3 (bank-account encryption), §8.5 (bookings/address), and current frontend code (`src/features/auth`, `src/features/order-flow`, `data/meals.json`).

### 1.1 Customer data

| Category | Fields | Source | Notes |
|---|---|---|---|
| Identity | Full name, email (citext), phone (E.164) | `app_users`, `customer_profiles`; collected today in `src/features/order-flow/components/AddressForm.tsx` (`contact.name`, `contact.email`, `contact.phone`) | Collected only when no authenticated account exists; otherwise sourced from account. |
| Authentication | Password hash (Argon2id), session tokens, CSRF hash | `auth_credentials`, `auth_sessions` (blueprint §8.2) | Not raw personal data exposed to users, but still personal information under POPIA (identifiable to a data subject). |
| Address | Area/suburb, street, estate/complex, unit, PostGIS point | `customer_addresses` (§8.2); `src/features/order-flow/components/AddressForm.tsx` fields `addr-area`, `addr-street`, `addr-estate`, `addr-unit` | Blueprint treats **exact address as field-protected** (§4.3.7, §8.5) — see minimization section below. Booking uses an immutable address snapshot. |
| Order / meal preferences | Plan choice, goal, meal/dish selections, sides, dessert, schedule | `src/features/order-flow/*` (`GoalSelect.tsx`, `MealSelect.tsx`, `SidesSelect.tsx`, `DessertSelect.tsx`, `ScheduleSelect.tsx`); catalog in `data/meals.json` | See §1.3 below on whether this is "special personal information." |
| Consent / communication | Marketing/transactional consent, suppression, opt-out records | `consent_events`, `communication_suppressions`, `inbound_opt_out_events` (§8.2); `D019` | Distinct lawful bases per channel — see §2. |
| Payment | Reusable card authorization metadata (fingerprint, tokenized), never raw card numbers | `private.billing_authorization_versions` (§8.4) | Card data is vaulted/encrypted by Paystack-side tokenization; platform stores only wrapped credential references. |
| Admin-visible | Masked bank/finance views, consent, subscription, booking, earnings history | `/admin/customers/:id` (§ endpoints table) | Access is role/permission-gated. |

### 1.2 Chef data

| Category | Fields | Source | Notes |
|---|---|---|---|
| Identity / recruitment | Applicant identity, source, status, reviewer decisions | `chef_applications`, `chef_application_events` (§8.2) | |
| Interview | Scheduled range, interviewer, mode, meeting reference, outcome | `chef_interviews`, `chef_interview_events` (§8.2) | |
| Onboarding | Profile/operational status, private media/document keys, versioned checklist | `chef_profiles`, `chef_onboarding_tasks`, `chef_documents` (§8.2) | Document keys imply uploaded identity/compliance documents (e.g. ID, certifications) — exact document types are not fully enumerated in the blueprint; **flag for privacy owner to confirm exact document types collected.** |
| Bank / financial | Bank name, account holder name, account number, branch code, account type, last four, HMAC fingerprint | `private.chef_bank_account_versions` (§8.3) | Encrypted at rest (AES-256-GCM, envelope/KMS), access restricted to payout worker only; general API/admin roles cannot select ciphertext (§8.3, §4.3.3). This is financial data warranting elevated protection. |
| Geography / availability | Service areas (admin polygons), chef primary/travel preference, availability rules/exceptions | `service_areas`, `chef_service_areas`, `chef_availability_rules/exceptions` (§8.2) | |
| Compensation | Offered/earned/paid amounts | `chef_earning_ledger`, DTOs per §4.2 | Confidentiality rules (§4.2) restrict what is exposed to the chef themself, not a privacy/POPIA control per se, but shows existing minimization discipline. |

### 1.3 Special / sensitive category flag

- **Bank account numbers**: explicitly financial data. Blueprint already treats this as requiring elevated protection — envelope encryption, per-row keys, KMS, payout-worker-only decryption, masked reads (§8.3, §4.3.3, §4.3.10). **Engineering read: this is consistent with POPIA's expectation of appropriate technical safeguards for financial account data — confirm with legal whether South Africa's POPIA (unlike GDPR) formally classifies financial account numbers as "special personal information"; POPIA's special-categories list (religious/philosophical belief, race/ethnicity, trade union membership, political persuasion, health, sex life, biometric, criminal behaviour — POPIA s26) does not by itself name bank details, but sectoral/financial-sector guidance may still require heightened care.**
- **Meal preferences / dietary data**: `data/meals.json` and order-flow selections (goal, plan, meal/dish choice) capture dietary style (e.g. protein bowls, low-carb framing per `GoalSelect.tsx`/`goals.ts`) but **do not appear to capture medical conditions, allergies, or health diagnoses** in the current code or blueprint tables reviewed. **Engineering read: this likely does NOT constitute "health data" as a POPIA special category on its own (it reads as dietary preference/lifestyle choice, not medical information) — confirm with legal, especially if any future field captures allergies, medical diets, or conditions, which would tip this into POPIA special personal information (health data, s26) requiring a stricter lawful basis (e.g. explicit consent).**
- **No other special categories** (race, religion, trade union membership, sex life, criminal record, biometric data) were found collected in the reviewed code or blueprint tables. **Flag: confirm chef document uploads (§8.2 `chef_documents`) don't include ID numbers/passport copies that could carry embedded special-category-adjacent data (e.g. photos revealing race) — if IDs are collected, treat as elevated-sensitivity identity documents even though not a POPIA special category itself.**

---

## 2. Lawful bases (candidate POPIA justifications)

POPIA (s11) requires processing to be justified by one of: consent, contract necessity, legal obligation, protecting a legitimate interest of the data subject, performance of a public duty, or legitimate interest of the responsible/third party. Candidates below are engineering-level suggestions only — **the privacy owner must confirm each.**

| Data category | Candidate lawful basis | Confidence | Notes |
|---|---|---|---|
| Customer identity/contact (name, email, phone) | Contract necessity (fulfilling the booking) | Clearly applicable | Needed to deliver the service ordered. |
| Customer exact address | Contract necessity | Clearly applicable | Required to physically deliver the chef service; blueprint already restricts exposure (§4.3.7). |
| Order/meal preferences | Contract necessity | Clearly applicable | Needed to fulfill the specific order. |
| Marketing communications (email/WhatsApp) | Consent (separate, channel-specific, per `D019`) | Clearly applicable, but **implementation-dependent** | Blueprint explicitly separates marketing consent from transactional necessity (`D019`, §8.2 `consent_events`) — this is good existing design. Needs owner sign-off on consent wording/mechanism (S15/S10 scope), not just architecture. |
| Transactional notifications (booking confirmations, status updates) | Contract necessity / legitimate interest | Clearly applicable | Not marketing; required for service delivery. |
| Chef bank account details | Contract necessity (paying the chef) | Clearly applicable | Necessary to execute payout obligations. |
| Chef identity/recruitment/interview records | Contract necessity (pre-contractual, recruitment) / legitimate interest | Needs judgment call | POPIA treats pre-contractual steps at the data subject's request as justifiable, but retention duration for rejected applicants needs an explicit legal view (see §5). |
| Chef documents (compliance/ID) | Legal obligation (if regulatory ID verification is required) or contract necessity | Needs judgment call | Depends on what documents are actually required and whether any statutory/regulatory retention duty applies (e.g. tax, food-safety, background-check regulations) — **privacy owner + relevant compliance function must confirm.** |
| Admin audit events, security logs | Legitimate interest (platform security, fraud prevention) | Clearly applicable | Standard security-logging justification, but confirm retention scope. |
| Financial ledger / accounting rows (§8.1 `ON DELETE RESTRICT`) | Legal obligation (statutory accounting/tax retention) | Clearly applicable in principle | **Exact statutory retention period is a legal question**, not an engineering one (see §5). |

---

## 3. Minimization

### 3.1 Existing positive controls (already reflect minimization thinking)

- **Chef confidentiality projection (§4.2)**: chef-facing DTOs are contractually restricted to `offered_amount_cents`, `earned_amount_cents`, `paid_amount_cents` and Rand-formatted equivalents; allocation rates, basis points, platform amounts, gross customer totals, and processor fees are excluded by API-level contract, verified by snapshot tests scanning chef JSON/email/WhatsApp/exports/page text (§4.2.5). This is a strong existing minimization control worth citing as a model for privacy minimization more broadly.
- **Exact address field-level restriction (`D017`, §4.3.7, §8.5)**: exact address is a "field-level restricted projection" — only the active assigned chef during the service-access window, or explicitly permitted and re-authenticated/audited operations/admin access, may read it. Support sees a mask by default; access is revoked on cancellation/reassignment and after the post-service cutoff; the field is excluded from history, caches, analytics, and exports; responses are `no-store`. This is a strong existing minimization control directly on point for customer address data.
- **Bank account masking (§8.3, §4.3.3)**: raw account numbers are never returned after initial submission; general API/admin roles cannot select ciphertext; only the payout worker decrypts. Access audit (`private.bank_account_access_audit`) records actor/purpose without decrypted values.
- **Billing authorization vaulting (§8.4)**: card credential material is forbidden from DTOs, logs, audit payloads, analytics, and exports; only the billing worker can decrypt/use it.

### 3.2 Areas needing tightest-possible scoping / open minimization questions

- **Exact address (`D017`) scope of "explicitly permitted, audited operations/admin access"**: the blueprint defines the control mechanism (re-authentication, audit, time-bound break-glass) but does not itself enumerate exactly *which* roles/positions can invoke break-glass, nor the maximum audited-access window length. **Flag: privacy owner should confirm the break-glass window and role list are minimal-necessary before S03 finalizes the schema fields/constraints that encode this rule.**
- **Chef document retention (`chef_documents`, §8.2)**: the blueprint states "review/retention facts" exist but does not specify what happens to documents after a chef is rejected, terminated, or a document expires. **Flag as a minimization gap: rejected/terminated chef documents should have an explicit deletion/anonymization path, not indefinite retention by default.**
- **Meal/dietary preference granularity**: current implementation (`GoalSelect.tsx`, `data/meals.json`) collects goal/plan/meal choices at a coarse level (bowls, style names) rather than granular health/dietary-restriction data. **This is currently minimal by construction — flag only as a forward-looking constraint: any future addition of allergy/medical-diet fields should trigger a re-review of lawful basis (see §1.3) and re-run of this minimization analysis, not be added silently.**
- **Admin audit events (`admin_audit_events`, §8.2)**: explicitly already redacts before/after values and never stores bank plaintext, tokens, secrets, or raw provider payloads — good existing minimization, but the *retention* of these audit rows is not itself minimized by the blueprint (append-only, indefinite by default) — see §5.

---

## 4. Processors and cross-border data flows

**This entire section is a list of open questions requiring external confirmation from each provider and/or legal — it is explicitly not researched fact.** Named per blueprint provider-port ADRs `D011`–`D014` (§3 decision register) and §21 references.

| Provider | Role | ADR / reference | Data categories likely shared | Open questions for privacy owner (require external confirmation) |
|---|---|---|---|---|
| **Paystack** | Payments (checkout, recurring billing) and Transfers (chef payouts) | `D011` Customer payments, `D012` Chef transfers, §21.1 | Customer payment metadata, card authorization tokens (not raw card numbers), chef bank transfer instructions, transaction references | 1. Where is Paystack's processing/storage infrastructure located (South Africa, other African region, or elsewhere)? 2. Does Paystack's standard terms constitute a cross-border transfer under POPIA (s72) if any processing occurs outside South Africa? 3. Is there a data processing agreement (DPA) in place with Paystack covering POPIA s20/s21 operator obligations? 4. What is Paystack's own data retention policy for transaction/webhook data? |
| **Resend** | Transactional and marketing email (contacts/segments/broadcasts, delivery webhooks) | `D013` Email, §21.2 | Customer/chef name, email address, message content/templates, delivery/engagement events | 1. Resend is a US-based provider — confirm where email content and recipient data are actually processed/stored. 2. Does this constitute a cross-border transfer under POPIA s72 (adequacy / contractual safeguards test)? 3. Is a DPA/standard contractual clauses equivalent in place? 4. What is Resend's data retention/deletion policy for contact lists and delivery logs, and can Chefmate enforce deletion on request? |
| **Meta (WhatsApp Cloud API)** | Proactive messaging via approved templates to consented recipients | `D014` WhatsApp, §21.2 | Customer/chef phone number, message content (templates), delivery status | 1. Meta's Cloud API processes messages through Meta's global infrastructure — confirm current data-residency/processing-location terms. 2. Does this meet POPIA's cross-border transfer test (s72), and does Meta's standard business terms provide adequate contractual safeguards? 3. Business verification and template approval are already flagged as an operational launch gate (blueprint, `D014`) — confirm privacy review is bundled into that same gate rather than assumed separately. 4. WhatsApp/Meta cross-border transfer review should also feed `G010` (Meta egress gate), not only `G011` — recommend explicit cross-reference between the two gates. |
| **KMS provider** (unspecified in blueprint — "production KMS" per §8.3) | Envelope encryption key management for bank account / billing credential encryption | §8.3, §4.3.10 | Wrapped encryption keys (not raw personal data directly, but controls access to it) | 1. Which KMS provider/region will actually be used in production? 2. Does key management itself introduce a cross-border dependency (e.g. a cloud KMS region outside South Africa)? |

**Recommendation to privacy owner**: treat this table as the starting checklist for provider due diligence (DPAs, sub-processor lists, data-residency confirmations) rather than a completed assessment — none of the residency/location claims above have been independently verified by this exercise.

---

## 5. Retention (candidate periods — business/legal decision, not engineering)

The blueprint encodes some retention-*adjacent* engineering invariants but does not set actual retention durations. Durations below are candidate starting points for discussion; **the privacy owner (with legal/finance input) must set the actual periods.**

| Data category | Engineering invariant already in place | Candidate retention period (needs legal/business confirmation) |
|---|---|---|
| Financial/audit/ledger rows (payments, refunds, payouts, journal entries) | `ON DELETE RESTRICT` (§8.1); erasure uses tombstoning/anonymization, never cascaded deletion of accounting evidence | Commonly 5–7 years under South African tax/accounting practice (e.g. Tax Administration Act recordkeeping expectations) — **this is a legal/finance determination, not an engineering default; do not hardcode without confirmation.** |
| Exact customer address (booking-linked) | Access revoked on cancellation/reassignment and post-service cutoff; excluded from history/analytics/exports (`D017`, §8.5) | Access-revocation timing is already engineered; but **underlying storage retention** (how long the address snapshot itself persists on the booking row, vs. just access-restriction) is undefined — flag for explicit decision. |
| Consent / suppression / opt-out records | Append-only, provider events never overwrite consent history (§8.2, note near line 401) | Should likely be retained for the life of the relationship plus a buffer to defend against disputed-consent claims — **exact buffer period is a legal call.** |
| Chef bank account version history | Immutable versioned rows, `payout_hold_until`, cooling-off (§8.3) | Retention likely tied to same financial/audit period as ledger rows — confirm alignment with the accounting retention decision above rather than setting independently. |
| Rejected/terminated chef applications and documents | No explicit retention/deletion path found in blueprint (§8.2 `chef_applications`, `chef_documents`) | **Currently undefined — flag as a gap.** Candidate: short-to-medium retention (e.g. 6–12 months) post-rejection for reconsideration/dispute purposes, then deletion/anonymization — needs legal confirmation, and needs to be added to S03 schema design once decided. |
| Admin audit events / security logs | Append-only, redacted (§8.2) | Common practice is 12–24 months for security logs, longer if tied to an active investigation — **legal/security-policy decision, not purely engineering.** |
| Marketing communication logs (`communication_messages`, `communication_events`) | Masked destination, sanitized snapshot; not indefinite by design intent but no explicit duration stated (§8.7) | Needs explicit period tied to consent lifecycle — flag for `G009` (the later, broader privacy/retention launch gate) as well as `G011`, since `G009` explicitly covers "final retention launch approval" per the gate table (line 779). **`G011` should set the baseline principle; `G009` finalizes it — the two must not be conflated (see blueprint §17 closing note, line 1177, which explicitly forbids merging distinct gates).** |

---

## 6. Open questions for the decision owner

Numbered list of exactly what needs a yes/no or specific answer to close `G011`:

1. Do you concur with the data inventory in §1 as complete and accurate for the current codebase and blueprint scope? (Yes/No — if no, what's missing?)
2. Do you approve the candidate lawful bases in §2, or do any need to change (e.g. should chef recruitment data use a different basis than "contract necessity")?
3. Is dietary/meal-preference data as currently implemented (goal/plan/meal selection, no medical/allergy fields) confirmed as **not** POPIA special personal information? (Yes/No)
4. Should bank account data receive any additional POPIA-specific handling beyond the existing encryption/access controls in §8.3, given it is financial account data? (Yes/No, and if yes, what?)
5. Do you approve engaging each processor (Paystack, Resend, Meta) for a formal cross-border transfer / DPA review before S03 schema freeze, per the open-questions table in §4? (Yes/No — this can be answered "yes, proceed with due diligence in parallel" without waiting for full DPA sign-off, if you judge that acceptable for schema freeze purposes.)
6. What KMS provider/region will actually be used in production, and does it introduce any new cross-border dependency? (Specific answer needed.)
7. What retention period should apply to financial/audit/ledger rows? (Specific answer needed — likely bounded by statutory accounting requirements.)
8. What retention period should apply to rejected/terminated chef applications and documents? (Specific answer needed — currently undefined in the blueprint.)
9. What retention period should apply to marketing communication logs, and should this be finalized now under `G011` or deferred to `G009`'s broader retention approval? (Specific answer needed.)
10. Are there any additional document types collected from chefs during onboarding (§8.2 `chef_documents`) that need explicit privacy classification (e.g. ID copies, certifications)? (Yes/No, and if yes, list them.)
11. Do you approve the minimization controls already in place (chef confidentiality DTO projection §4.2, exact-address field restriction `D017`, bank/billing credential vaulting §8.3/§8.4) as sufficient baseline minimization for S03 schema freeze? (Yes/No)
12. Any additional lawful-basis, minimization, processor, or retention concern not captured above that should block or condition S03 schema freeze? (Open-ended)

---

## 7. What G011 blocks

Per the blueprint's gate register (§17, line 781) and progress-ledger open-decision register:

- `G011` blocks **`S03`** (the core domain schema/contract freeze step) only. It explicitly does **not** block `S02` (platform scaffolding), which proceeds in parallel per this task's framing.
- Affected acceptance IDs, per the gate table: **`A16`** (admin communication log / consent-gated marketing sends), **`A19`** (cross-tenant/permission/session/RLS matrix), **`A20`** (bank-change step-up/cooling-off/no-leak controls), **`A22`** (legacy-client compatibility, canonical output/history correctness, forward-only migrations).
- The blueprint's S03 section explicitly states: "`G011` must be approved before S03 schema freeze" and lists `G011` baseline evidence as required before schema freeze in its exit criteria (blueprint, S03 section, line ~990, ~994).
- `G011` is explicitly distinguished from `G009` (the later, broader profiling/data-subject/incident/bank/campaign privacy and *final* retention launch approval) — the blueprint's closing governance note (line 1177) states a mutation "may not merge them implicitly." This pack treats `G011` as the **baseline** inventory/lawful-basis/minimization/processor/retention-principles approval that unblocks schema design, not the final, complete privacy sign-off for launch (that remains `G009`'s scope).

---

## Summary for reviewer

This is a **decision pack, not a decision**. It inventories personal data collected by Chefmate today and as planned in the execution blueprint (customer identity/address/order data, chef identity/bank/document data), proposes candidate POPIA lawful bases per category, identifies existing minimization controls worth keeping (chef DTO confidentiality, exact-address field restriction, bank/billing credential vaulting) plus gaps needing attention (chef document retention, break-glass scope), lists every named third-party processor (Paystack, Resend, Meta) with open cross-border/DPA questions requiring external confirmation, and proposes candidate retention periods flagged explicitly as business/legal decisions. Every legal-sounding claim in this document is phrased as a non-binding engineering read requiring legal confirmation, not a settled compliance position.

**`G011` remains OPEN.** No engineering agent can close this gate. A human Privacy / legal / data-protection owner must review this pack, answer the numbered questions in §6, and record formal sign-off before `S03`'s schema/contract freeze proceeds.
