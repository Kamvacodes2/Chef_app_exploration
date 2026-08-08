import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">
        Website & App Terms of Use
      </h1>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/50">Version 2026-08-09</p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Introduction</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Welcome to ChefMate. These Terms of Use govern your access to and use of the ChefMate
            website, mobile application, and platform services. By accessing or using ChefMate, you
            agree to be bound by these terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">2. Platform Nature</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate operates as a technology platform connecting customers with independent
            third-party chefs. ChefMate does not employ chefs, nor does it provide catering or chef
            services directly. Chefs operate as independent contractors.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">3. User Eligibility</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You must be at least 18 years old to create an account and use ChefMate. By creating an
            account, you confirm that you meet this age requirement and that all information you
            provide is accurate and complete.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">4. Account Security</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You are responsible for maintaining the confidentiality of your account credentials. You
            agree to notify ChefMate immediately of any unauthorised use of your account.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">5. Acceptable Use</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            You agree not to misuse the platform, including but not limited to: fraud, harassment,
            discrimination, off-platform circumvention of bookings, or any illegal activity.
            ChefMate reserves the right to suspend or terminate accounts that violate these terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            6. Intellectual Property
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate owns its platform software, databases, brand assets, and platform-generated
            content. Users retain ownership of content they submit but grant ChefMate a limited
            licence to host, display, and operate the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            7. Platform Availability
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate provides the platform on an &ldquo;as available&rdquo; basis. While we make
            reasonable efforts to maintain service availability, we do not guarantee uninterrupted
            access.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            8. Limitation of Liability
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            To the extent permitted by South African law, ChefMate excludes liability for losses
            caused by independent chef acts, customer ingredients or appliances, platform outages,
            and indirect or consequential losses. ChefMate does not exclude liability that cannot
            lawfully be excluded under the Consumer Protection Act or POPIA.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">9. Contact</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:support@chefmate.co.za"
              className="font-semibold text-[var(--color-oxblood)] hover:underline"
            >
              support@chefmate.co.za
            </a>
            .
          </p>
        </div>
      </section>
    </article>
  );
}
