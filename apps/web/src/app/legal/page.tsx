import Link from "next/link";

interface PolicyCardProps {
  readonly title: string;
  readonly href: string;
  readonly description: string;
  readonly audience: string;
  readonly effectiveDate: string;
  readonly badgeColor?: string;
}

function PolicyCard({
  title,
  href,
  description,
  audience,
  effectiveDate,
  badgeColor = "bg-[var(--color-oxblood)]/10 text-[var(--color-oxblood)]",
}: PolicyCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-6 shadow-[0_10px_30px_rgba(70,33,24,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-oxblood)]/30 hover:shadow-[0_15px_40px_rgba(70,33,24,0.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}>
          {audience}
        </span>
        <span className="text-xs text-[var(--color-charcoal)]/50">
          Effective: {effectiveDate}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-bold text-[var(--color-charcoal)] transition-colors group-hover:text-[var(--color-oxblood)]">
        {title} →
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-charcoal)]/70">
        {description}
      </p>
    </Link>
  );
}

export default function LegalIndexPage() {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-brand text-xl text-[var(--color-oxblood)]">
          ChefMate
        </Link>
        <span className="text-xs text-[var(--color-charcoal)]/60">
          South African Regulatory Compliance
        </span>
      </div>

      <header className="rounded-2xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)] p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-oxblood)]/70">
          Legal &amp; Regulatory Hub
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          Chef Mate Legal Policies
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/80">
          Transparency, trust, and consumer safety are foundational to Chef Mate. Below are the binding
          legal policies, statutory terms, and regulatory manuals governing our private chef marketplace.
        </p>
      </header>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <PolicyCard
          title="Customer Terms and Conditions"
          href="/legal/customer-terms"
          audience="Customers"
          effectiveDate="13/09/2026"
          description="Governs customer bookings, CPA statutory protections, cancellation rules, session inclusions, and dispute resolution."
        />

        <PolicyCard
          title="Privacy Policy"
          href="/legal/privacy"
          audience="Customers &amp; Chefs"
          effectiveDate="13/09/2026"
          description="POPIA compliance framework detailing personal information handling, background check processing, and Information Officer details."
        />

        <PolicyCard
          title="Complaints Handling Process"
          href="/legal/complaints-handling"
          audience="Customers &amp; Chefs"
          effectiveDate="13/09/2026"
          description="Binding dispute resolution procedures, safety investigation tiers, target resolution timeframes, and AFSA mediation."
        />

        <PolicyCard
          title="PAIA Manual (Section 51)"
          href="/legal/paia-manual"
          audience="Public / All Users"
          effectiveDate="13/09/2026"
          description="Statutory access to information manual under PAIA and POPIA, including records catalogue, request procedures, and prescribed fees."
        />

        <PolicyCard
          title="Chef Terms and Conditions"
          href="/legal/chef-agreement"
          audience="Chefs"
          effectiveDate="18/08/2026"
          description="Contractual agreement for independent culinary professionals detailing commissions, payout terms, and marketplace standards."
        />

        <PolicyCard
          title="Chef Code of Conduct"
          href="/legal/code-of-conduct"
          audience="Chefs"
          effectiveDate="09/08/2026"
          description="Professional hygiene, kitchen safety, and ethical conduct standards required of all chefs on the platform."
        />

        <PolicyCard
          title="Platform Rules"
          href="/legal/platform-rules"
          audience="All Users"
          effectiveDate="19/08/2026"
          description="Acceptable use policy, anti-circumvention rules, zero-tolerance safety mandates, and account integrity standards."
        />

        <PolicyCard
          title="Review and Ratings Policy"
          href="/legal/review-and-ratings"
          audience="Customers &amp; Chefs"
          effectiveDate="19/08/2026"
          description="Rules governing verified reviews, ratings calculation, fake review prohibition, and content moderation."
        />

        <PolicyCard
          title="Website Terms of Use"
          href="/legal/terms"
          audience="Website Visitors"
          effectiveDate="09/08/2026"
          description="General conditions of access, intellectual property notices, and disclaimers for visitors to chefmate.co.za."
        />
      </div>

      <footer className="mt-10 rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/30 p-5 text-xs text-[var(--color-charcoal)]/70">
        <p className="font-bold text-[var(--color-charcoal)]">Need legal or regulatory assistance?</p>
        <p className="mt-1">
          Contact our Legal &amp; Compliance Team at{" "}
          <a className="font-semibold text-[var(--color-oxblood)] underline" href="mailto:privacy@chefmate.co.za">
            privacy@chefmate.co.za
          </a>{" "}
          or Customer Support at{" "}
          <a className="font-semibold text-[var(--color-oxblood)] underline" href="mailto:support@chefmate.co.za">
            support@chefmate.co.za
          </a>
          .
        </p>
      </footer>
    </article>
  );
}
