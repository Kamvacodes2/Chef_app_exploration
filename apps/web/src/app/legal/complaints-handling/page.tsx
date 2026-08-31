import Link from "next/link";

export default function ComplaintsHandlingPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">
        Complaints Handling Process
      </h1>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[var(--color-charcoal)]/75">
        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Purpose and scope</h2>
          <p className="mt-2">
            This binding process covers complaints about a booking, Chef or Customer conduct,
            safety, food quality, property, payment, refund, payout, review, privacy, or access to
            the Chef Mate platform. Chef Mate facilitates and administers the process but is not a
            court, statutory regulator, ombud, or arbitrator.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            2. How to submit a complaint
          </h2>
          <p className="mt-2">
            Send the complaint through an available in-platform support channel or to{" "}
            <a
              className="font-semibold text-[var(--color-oxblood)] underline"
              href="mailto:support@chefmate.co.za"
            >
              support@chefmate.co.za
            </a>
            . Include your name and contact details, the booking reference if applicable, what
            happened, when it happened, the outcome sought, and any immediate safety or
            accessibility need. Report urgent safety, suspected crime, foodborne illness, or
            unauthorised disclosure as soon as reasonably possible; contact emergency services or
            the appropriate authority where immediate assistance is required.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            3. Intake and acknowledgement
          </h2>
          <p className="mt-2">
            A support person records and categorises the complaint, checks whether urgent interim
            action is needed, identifies missing information, and acknowledges receipt as soon as
            reasonably possible. If the matter belongs with a payment provider, regulator, insurer,
            law-enforcement body, or another forum, Chef Mate may explain that route while
            continuing to handle any platform issue within its scope.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            4. Evidence and fair participation
          </h2>
          <p className="mt-2">
            Chef Mate may request platform messages, receipts, photographs, booking records,
            statements, access records, medical or safety information where relevant and lawful, or
            other reasonably necessary material. Each affected person may provide an account and
            supporting evidence and, before a material adverse finding where reasonably possible,
            respond to the substance of adverse information. Only share information you are entitled
            to provide; irrelevant sensitive information may be restricted or removed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            5. Assessment and response
          </h2>
          <p className="mt-2">
            A person assesses the available evidence, applicable policies and law, seriousness,
            credibility, safety, prior relevant history, losses, and proposed resolution. Chef Mate
            may ask follow-up questions, facilitate an agreed outcome, explain why more time is
            reasonably needed, or issue a written outcome. The process is manual; no complaint
            outcome or adverse account decision is represented as automatic.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            6. Interim and final platform outcomes
          </h2>
          <p className="mt-2">
            Where authorised by the applicable terms and law, an outcome may include information or
            an apology, correction, rescheduling, an accepted substitute, credit, full or partial
            refund, payout release or adjustment, content moderation, a warning, a safety condition,
            feature restriction, suspension, or termination. Interim measures may protect people,
            evidence, funds, or legal compliance while facts are assessed. A comparable substitute
            is never imposed without the Customer&apos;s acceptance. Any cancellation charge must be
            individually reasonable under section 17 of the CPA.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">7. Escalation</h2>
          <p className="mt-2">
            A complex, high-risk, unresolved, or contested matter may be escalated to a more senior
            support or operational decision-maker, the Information Officer for privacy matters,
            professional legal or safety advisers, a payment provider, insurer, or competent
            authority. Information is shared only where reasonably necessary and lawful.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">8. Internal review</h2>
          <p className="mt-2">
            A person affected by a material outcome may request human review, identify the outcome
            challenged, explain the alleged error, and provide new or overlooked material. Wherever
            practicable, someone not responsible for the original outcome considers the request and
            communicates whether the outcome is confirmed, changed, or returned for further inquiry.
            Repetitive requests with no relevant new ground may be closed with reasons.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            9. Privacy and record keeping
          </h2>
          <p className="mt-2">
            Complaint information is handled under the Privacy Policy, restricted to people and
            providers who reasonably need it, and retained only as long as necessary for resolution,
            safety, legal obligations, evidence, and the establishment, exercise, or defence of
            rights. Chef Mate may withhold another person&apos;s confidential information where law
            requires or permits it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            10. No waiver of rights
          </h2>
          <p className="mt-2">
            Using or completing this process does not waive, replace, shorten, or prevent any right
            to approach the National Consumer Commission, Consumer Goods and Services Ombud,
            Information Regulator, Equality Court, police, another competent authority, or a court.
            No policy deadline overrides a statutory limitation period or a non-waivable right.
          </p>
        </section>
      </div>
    </article>
  );
}
