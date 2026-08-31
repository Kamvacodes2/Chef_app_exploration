import Link from "next/link";

export default function ReviewAndRatingsPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">Review and Ratings Policy</h1>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[var(--color-charcoal)]/75">
        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Scope and purpose</h2>
          <p className="mt-2">
            This binding policy governs ratings, written reviews, review responses, and related
            reports concerning Chef Mate Bookings. It supports useful, honest feedback while
            protecting users from manipulation, retaliation, unlawful content, and irrelevant
            disclosure. It applies to Customers, Chefs, administrators, and support personnel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            2. Verified-booking eligibility
          </h2>
          <p className="mt-2">
            Only a Customer or Chef connected to a Booking that Chef Mate can verify from platform
            records may review that Booking or the other participant&apos;s performance. One person
            may not submit multiple reviews for the same side of a Booking, review a service they
            did not receive or perform, or arrange a review from a friend, household member,
            employee, agent, or paid third party who was not an eligible participant.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            3. Honest and relevant content
          </h2>
          <p className="mt-2">
            Reviews must reflect the reviewer&apos;s genuine booking experience and distinguish fact
            from opinion. Keep content relevant to communication, punctuality, safety, cleanliness,
            agreed Services, customer readiness, premises, or another material part of the Booking.
            Do not make knowingly false claims or omit a material incentive or conflict.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            4. Prohibited content and conduct
          </h2>
          <p className="mt-2">
            Reviews may not contain threats, harassment, hate speech, discriminatory abuse, sexual
            content, extortion, retaliation, impersonation, spam, illegal material, irrelevant
            advertising, malicious links, or another person&apos;s private address, contact,
            identity, health, biometric, financial, or background information. Do not offer money,
            discounts, services, refunds, or pressure in exchange for a positive review, changed
            review, withheld review, or removal of truthful feedback.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            5. Fraud and manipulation
          </h2>
          <p className="mt-2">
            Fake bookings, coordinated ratings, reciprocal-review rings, duplicate accounts,
            selective incentives, review buying or selling, and attempts to suppress legitimate
            feedback are prohibited. Chef Mate personnel may compare the review with booking and
            support records and request context or evidence. A concern is assessed by a person and
            is not treated as proven merely because software or another user flags it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">6. Moderation</h2>
          <p className="mt-2">
            After human assessment, Chef Mate may leave content unchanged, restrict personal
            information, ask the author to clarify or revise it, hide it while investigating, or
            remove all or part of it where this policy or law is breached. Chef Mate does not remove
            a review merely because it is critical, unfavourable, disputed, or describes an honestly
            held opinion. Where practical, moderation preserves the relevant lawful substance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            7. Responses and account decisions
          </h2>
          <p className="mt-2">
            Where a response feature or support process is available, the reviewed person may give
            concise, respectful context. Review information may inform a proportionate manual
            safety, quality, or account decision together with other evidence. A single low rating
            does not automatically restrict, suspend, or terminate an account, and no adverse
            decision is made solely by automated processing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            8. Reporting and evidence
          </h2>
          <p className="mt-2">
            Report a review through an available support channel or to{" "}
            <a
              className="font-semibold text-[var(--color-oxblood)] underline"
              href="mailto:support@chefmate.co.za"
            >
              support@chefmate.co.za
            </a>
            , identifying the review, the policy ground, and relevant evidence. Chef Mate may ask
            the author and affected person for information. Reports are not a means to obtain
            removal merely because the parties disagree about events.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">9. Human appeal</h2>
          <p className="mt-2">
            An author or affected person may request review of a moderation or material account
            outcome through the Complaints Handling Process, explain the alleged error, and provide
            relevant new or overlooked information. Wherever practicable, a different person reviews
            the decision and communicates whether it is confirmed, changed, or requires further
            inquiry.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            10. Privacy, law, and related policies
          </h2>
          <p className="mt-2">
            Review information is handled under the{" "}
            <Link className="underline" href="/legal/privacy">
              Privacy Policy
            </Link>
            . This policy operates with the{" "}
            <Link className="underline" href="/legal/platform-rules">
              Platform Rules
            </Link>{" "}
            and{" "}
            <Link className="underline" href="/legal/complaints-handling">
              Complaints Handling Process
            </Link>
            . Nothing here limits lawful reporting, fair comment, consumer rights, privacy rights,
            regulatory remedies, or access to a competent court.
          </p>
        </section>
      </div>
    </article>
  );
}
