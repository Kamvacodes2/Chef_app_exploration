"use client";

import Link from "next/link";

export default function CustomerTermsPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">
        Customer Terms & Conditions
      </h1>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/50">Version 2026-08-09</p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Platform Role</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate is a technology platform connecting you with independent third-party chefs.
            ChefMate is not the chef, employer, or catering provider. The chef independently
            provides the in-home cooking service. ChefMate provides discovery, matching, booking
            technology, payment facilitation, safety controls, and support.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            2. Booking Confirmation
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            A booking is confirmed only when a chef accepts your request AND your payment or payment
            authorisation succeeds. Before that, it is a booking request.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">3. Pricing and Payment</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate displays the full price before you confirm. Prices include the chef's service
            fee and the platform fee. Prices will not change after a booking is confirmed unless you
            and the chef mutually agree to changes.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">4. Cancellation Policy</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Full refund if you cancel more than 24 hours before the session. 50% charge if you
            cancel between 6 and 24 hours before. 100% charge if you cancel within 6 hours or if you
            are a no-show (unavailable when the chef arrives after reasonable attempts to reach
            you). If ChefMate or the chef cancels and no replacement is found, you receive a full
            refund.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">5. Your Obligations</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You must provide: safe and suitable groceries, a reasonably safe and usable kitchen,
            working essential utilities and appliances, ordinary cookware and utensils (unless
            stated otherwise), accurate access, parking, security, and pet information, and complete
            allergy and dietary disclosures. An adult must be reachable during the session.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            6. Allergies and Dietary Requirements
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You must disclose all known allergies, intolerances, and material dietary restrictions
            accurately before the chef accepts the booking. Because the chef works in your kitchen
            with your ingredients and equipment, ChefMate and the chef cannot guarantee an
            allergen-free environment. The chef must take reasonable precautions for disclosed
            allergens.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">7. Kitchen and Access</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            If the chef cannot gain access, they will contact you and wait 15 minutes. If access
            remains impossible for a customer-attributable reason, it is treated as a no-show. The
            chef may refuse to proceed where the premises, people, pets, utilities, appliances, or
            ingredients create a material safety risk.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            8. Refunds and Complaints
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Report food safety concerns or property issues as soon as reasonably possible, and
            quality issues preferably within 48 hours. We investigate material service failures and
            may issue a full or partial refund or credit without admitting liability. Taste
            preference alone does not automatically trigger a refund where the agreed recipe was
            safely and competently prepared.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            9. Limitation of Liability
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            To the extent permitted by law, ChefMate excludes liability for losses caused by
            independent chef acts outside ChefMate's own fault, customer-supplied ingredients,
            household appliances or premises, and indirect or consequential losses. ChefMate does
            not exclude liability for its own fraud, gross negligence, or non-excludable consumer or
            privacy rights.
          </p>
        </div>
      </section>
    </article>
  );
}
