import Link from "next/link";

export default function PlatformRulesPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">Platform Rules</h1>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/50">
        Version 2026-08-19 · Effective 19 August 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[var(--color-charcoal)]/75">
        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Scope and role</h2>
          <p className="mt-2">
            These binding rules apply to every Customer, Chef, administrator, and support user of
            the Chef Mate website, applications, booking tools, messaging channels, and support
            processes. Chef Mate operates a marketplace that introduces Customers to independent
            Chefs, facilitates bookings and payments, and administers safety, support, and policy
            processes. A Chef, not Chef Mate, independently performs the booked personal-chef
            service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">2. Honest platform use</h2>
          <p className="mt-2">
            Provide accurate, current information; use only an account you are authorised to use;
            protect access credentials; and communicate honestly about identity, qualifications,
            availability, pricing, booking details, allergies, premises, and performance. Do not
            impersonate another person, submit false documents, manipulate eligibility or payments,
            create deceptive accounts, or misuse another person&apos;s information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            3. Respect and prohibited conduct
          </h2>
          <p className="mt-2">
            Harassment, threats, violence, hate speech, discrimination, sexual misconduct,
            retaliation, intimidation, stalking, exploitation, unlawful drugs or weapons, theft,
            property damage, and abusive or deceptive communications are prohibited. Users must not
            upload illegal, infringing, malicious, obscene, or privacy-invasive material, interfere
            with the platform, probe security, spread malware, scrape restricted information, or use
            the service for an unlawful purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            4. Booking and household safety
          </h2>
          <p className="mt-2">
            Customers must disclose material access, security, pet, allergy, dietary, appliance, and
            premises risks and provide a reasonably safe kitchen, working essential utilities, and
            suitable customer-supplied ingredients and equipment. Chefs must follow food-safety and
            hygiene law, disclosed dietary requirements, reasonable access rules, and the Chef Code
            of Conduct. Anyone facing an immediate threat should leave safely and contact emergency
            services; notify Chef Mate as soon as reasonably possible afterwards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            5. Privacy and communications
          </h2>
          <p className="mt-2">
            Use booking information only to arrange and perform that booking. Do not publish,
            retain, sell, or share addresses, contact details, health or dietary information,
            identity documents, background information, messages, photographs, or recordings except
            where necessary for the booking, consented to, or required by law. Do not record inside
            a private home without the informed agreement of affected people.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            6. No circumvention or payment diversion
          </h2>
          <p className="mt-2">
            Do not move a Chef Mate introduction or booking off-platform to avoid applicable fees,
            safety controls, payment protections, or records. Do not solicit or accept hidden cash,
            direct transfers, or another payment method for a platform booking, share contact
            details for circumvention, or help another person evade these rules. A lawful private
            relationship that did not result from Chef Mate is not brought within these rules merely
            because a person also has an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            7. Reviews, complaints, and evidence
          </h2>
          <p className="mt-2">
            Reviews must follow the Review and Ratings Policy. Complaints must follow the Complaints
            Handling Process. Preserve relevant messages, receipts, photographs, and booking
            records; provide authentic evidence when reasonably requested; and do not fabricate,
            alter, suppress, or retaliate over evidence, a complaint, or a review.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            8. Proportionate manual enforcement
          </h2>
          <p className="mt-2">
            Chef Mate personnel may investigate a report, request information, issue a warning,
            restrict a feature, pause a booking or payout where lawfully justified, suspend access,
            or terminate an account. Decisions are made by people after considering seriousness,
            urgency, evidence, history, safety, law, and a user&apos;s response; enforcement is not
            represented as automatic. Urgent interim action may be taken first to protect people,
            evidence, payments, or legal compliance, followed by prompt human review where lawful.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            9. Notice, response, and appeal
          </h2>
          <p className="mt-2">
            Where reasonably possible, Chef Mate will give notice of material adverse information,
            the proposed or taken action, and a fair opportunity to respond. A user may submit
            relevant context or evidence and request review through the Complaints Handling Process.
            Nothing in these rules removes any non-waivable consumer, privacy, labour, equality,
            regulatory, ombud, or court right.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            10. Contact and related policies
          </h2>
          <p className="mt-2">
            Contact{" "}
            <a
              className="font-semibold text-[var(--color-oxblood)] underline"
              href="mailto:support@chefmate.co.za"
            >
              support@chefmate.co.za
            </a>
            . These rules operate with the applicable{" "}
            <Link className="underline" href="/legal/chef-agreement">
              Chef Terms
            </Link>
            ,{" "}
            <Link className="underline" href="/legal/customer-terms">
              Customer Terms
            </Link>
            ,{" "}
            <Link className="underline" href="/legal/code-of-conduct">
              Chef Code of Conduct
            </Link>
            ,{" "}
            <Link className="underline" href="/legal/privacy">
              Privacy Policy
            </Link>
            ,{" "}
            <Link className="underline" href="/legal/complaints-handling">
              Complaints Handling Process
            </Link>
            , and{" "}
            <Link className="underline" href="/legal/review-and-ratings">
              Review and Ratings Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
