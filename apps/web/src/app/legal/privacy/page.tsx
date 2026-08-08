import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/50">
        Version 2026-08-09 · Effective 9 August 2026
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            1. Information We Collect
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            ChefMate collects information necessary to provide the platform service. For chefs:
            identity/contact details, profile photo, qualifications, food-safety certifications,
            background screening results, banking details, availability, and booking history. For
            customers: identity/contact details, service address, payment information,
            dietary/allergy requirements, and booking history. We do not store full credit card
            numbers.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            2. How We Use Your Information
          </h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Your information is used strictly for: account management, matching and booking, payment
            processing, providing address and dietary information needed for bookings, safety and
            fraud prevention, customer support, legal compliance, and service improvement. We do not
            use your data for purposes beyond these without your consent.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">3. Information Sharing</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Before a booking is confirmed, customers see a chef's first name, profile photo, bio,
            and ratings. After a chef accepts and payment is confirmed, the chef receives the
            customer's first name, service address, dietary/allergy/access information, and an
            in-platform communication route. We minimise shared information to what is necessary for
            each booking.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">4. Data Security</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            We store data with reputable cloud providers using encryption in transit and at rest.
            Access is limited to authorised personnel through role-based controls. Payment
            information is tokenised through our payment processor.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">5. Data Retention</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            We retain personal data only as long as necessary for the purposes described.
            Account/profile data is kept while your account is active. Financial transaction records
            are retained for 5-7 years as required by law. Access instructions and sensitive
            documents are deleted or restricted once their purpose has ended.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">6. Your Rights (POPIA)</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Under the Protection of Personal Information Act, you have the right to access, correct,
            delete, or object to the processing of your personal information. To exercise these
            rights, contact our Information Officer.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">7. Marketing</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            We may send newsletters, promotional emails, or SMS where you have opted in. You can
            unsubscribe at any time. Transactional messages (bookings, safety alerts, account
            notices) are separate from marketing communications.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">8. Contact</h2>
          <p className="mt-2 text-[var(--color-charcoal)]/70">
            Information Officer:{" "}
            <a
              href="mailto:privacy@chefmate.co.za"
              className="font-semibold text-[var(--color-oxblood)] hover:underline"
            >
              privacy@chefmate.co.za
            </a>
          </p>
        </div>
      </section>
    </article>
  );
}
