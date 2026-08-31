"use client";

import Link from "next/link";

function ReturnToAcceptance() {
  return (
    <Link
      href="/chef/portal"
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-oxblood)]/25 px-3 text-sm font-bold text-[var(--color-oxblood)]"
    >
      <span aria-hidden="true">←</span> Back to acceptance
    </Link>
  );
}

export default function CodeOfConductPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-brand text-xl text-[var(--color-oxblood)]">
          ChefMate
        </Link>
        <ReturnToAcceptance />
      </div>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">Chef Code of Conduct</h1>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Our Brand Promise</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate is practical, warm, competent, and discreet household support. You arrive
            prepared, cook safely, respect the home, clean up, and leave without creating extra work
            for the customer. Our promise is: &ldquo;Dinner is handled.&rdquo;
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            2. Respectful Treatment
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Treat customers, household members, and others with respect. Follow reasonable dietary
            and cultural instructions agreed in the booking. Protect privacy and property. Never
            harass, discriminate, threaten, or solicit personal relationships.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            3. Hygiene and Food Handling
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Wash hands thoroughly before and during food preparation. Wear clean clothing and
            restrain hair. Do not attend a booking if you are ill or contagious. Keep raw and cooked
            foods separate. Control allergens and cross-contamination. Use clean equipment and
            surfaces. Maintain safe temperatures and storage. Dispose of unsafe food immediately.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">4. Communication</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Acknowledge material booking messages within a reasonable period while you are
            available. Check messages before travelling to a booking. Report any delays, safety
            concerns, or access problems promptly through the platform during an active booking.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">5. Punctuality</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Arrive on time for every accepted booking. A 10-minute grace period applies. Notify the
            customer through the platform if you will be more than 10 minutes late. Lateness over 20
            minutes without notice is recorded as a service incident. Repeated lateness may affect
            your platform access.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            6. Conduct in Customer Homes
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Use only areas and property reasonably necessary for the booking. No unapproved guests.
            No smoking, vaping, alcohol, or drugs. No unrelated use of customer property. Wash used
            cookware and utensils. Wipe work surfaces. Leave appliances safely off. Consolidate
            cooking waste. Report breakages immediately. Leave the kitchen reasonably clean.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            7. Photography and Social Media
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Do not take photos during a booking without the customer's explicit consent for that
            specific booking. Photos must not show children or faces without separate consent, or
            capture house numbers, security systems, or personal documents. Any marketing use
            requires separate permission.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">8. Prohibited Conduct</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            The following may result in immediate access restriction: violence or threats, sexual
            misconduct or harassment, theft or fraud, serious discrimination, intoxication or drug
            use during a booking, identity or account sharing, deliberate property damage, serious
            or reckless food-safety misconduct, or weapons carried contrary to law or policy.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">9. Consequences</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Non-compliance follows a fair process: complaint is received and triaged, your access
            may be paused where safety or evidence requires it, you receive written notice of the
            issue and a reasonable opportunity to respond, and a documented outcome is issued (no
            action, coaching, warning, suspension, or removal). You may request a review of the
            decision.
          </p>
        </div>
      </section>
    </article>
  );
}
