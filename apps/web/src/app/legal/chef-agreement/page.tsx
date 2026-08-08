import Link from "next/link";

export default function ChefAgreementPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">
        Chef Service Provider Agreement
      </h1>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/50">Version 2026-08-09</p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            1. Independent Contractor Status
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You operate as an independent contractor, not an employee of ChefMate. You are not
            entitled to employee benefits such as leave, pension, or medical aid. You are
            responsible for your own tax registration, filings, and compliance obligations. ChefMate
            does not deduct PAYE, UIF, or SDL from your earnings.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">2. Platform Access</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Completing onboarding does not create an unconditional right to use the platform. Access
            is subject to eligibility, documentation, and safety requirements. ChefMate retains
            discretion to approve, reject, or wait-list applicants based on objective criteria
            including verification, geographic demand, and safety.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">3. Booking Process</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You may accept or decline booking opportunities at your discretion. Once you accept a
            booking, you are expected to perform it. Patterns of accepting and then cancelling may
            trigger account review. You are not penalised for declining before acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">4. Pricing and Payment</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate sets standard session prices. Your net payout is displayed before you accept
            any booking. ChefMate deducts a platform fee. Payouts are processed weekly after
            completed sessions. Tips are 100% yours. Chargeback losses are borne by ChefMate unless
            caused by your fraud, non-performance, or breach.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">5. Service Standards</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You agree to maintain professional standards: punctuality, respectful conduct, safe and
            hygienic food handling, following the confirmed menu and dietary requirements,
            reasonable communication, protecting customer property and privacy, and leaving the
            kitchen clean at session end.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">6. Cancellation Policy</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Avoidable cancellations after acceptance are tracked. After 2 cancellations in a rolling
            30-day period, you receive a warning. After 3, your account may be temporarily paused
            for review. Genuine emergencies (illness, death, family emergency) are excluded.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">7. Food Safety</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You are responsible for safe food handling, cooking, and contamination control during
            the session. You must report any food safety incident immediately. ChefMate may
            temporarily pause your access while a serious safety concern is investigated.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">8. Non-Circumvention</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You agree not to accept off-platform payment for a ChefMate-originated booking or to
            directly solicit a customer introduced through ChefMate for 12 months after the last
            ChefMate booking. Pre-existing customer relationships are excluded.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            9. Suspension and Termination
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Minor or isolated issues result in warnings or retraining. Repeated issues, expired
            documents, or unresolved complaints may result in temporary suspension. Violence,
            harassment, theft, fraud, intoxication, identity sharing, serious discrimination, or
            grave food-safety breaches may result in permanent removal.
          </p>
        </div>
      </section>
    </article>
  );
}
