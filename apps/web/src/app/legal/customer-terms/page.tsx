import type { ReactNode } from "react";
import Link from "next/link";

const contents = [
  ["introduction", "Introduction and Scope"],
  ["cpa-notice", "Consumer Protection Notice"],
  ["definitions", "Definitions and Interpretation"],
  ["platform-role", "Platform Role and Nature of Services"],
  ["eligibility-account", "Account Registration and Eligibility"],
  ["booking-confirmation", "Booking Process and Confirmation"],
  ["pricing-payment", "Pricing, Payment, and Inclusions"],
  ["cancellations-refunds", "Cancellations, Rescheduling, and Refunds"],
  ["chef-inability", "Chef Inability to Perform and Substitutions"],
  ["subscription-terms", "Subscription Packages and Multi-Session Terms"],
  ["customer-responsibilities", "Customer Responsibilities and Kitchen Safety"],
  ["allergies-food-safety", "Food Safety, Allergies, and Dietary Requirements"],
  ["cooling-off", "Cooling-Off Rights (ECTA)"],
  ["liability-indemnities", "Limitation of Liability and Indemnities"],
  ["dispute-resolution", "Dispute Resolution and AFSA Mediation"],
  ["general", "General Provisions, Amendments, and Contact Details"],
] as const;

interface TermsSectionProps {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly children: ReactNode;
  readonly risk?: boolean;
}

function TermsSection({ id, number, title, children, risk = false }: TermsSectionProps) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2
        className={`text-xl font-black ${risk ? "text-red-900" : "text-[var(--color-charcoal)]"}`}
      >
        {number}. {title}
      </h2>
      <div className="mt-4 space-y-4 text-[var(--color-charcoal)]/80">{children}</div>
    </section>
  );
}

function Clause({ number, children }: { readonly number: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[3.5rem_1fr] sm:gap-3">
      <span className="font-semibold text-[var(--color-charcoal)]/45">{number}</span>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Definition({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--color-oxblood)]/8 pb-3 last:border-0">
      <dt className="font-bold text-[var(--color-charcoal)]">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const alphaListClass = "list-[lower-alpha] space-y-2 pl-6";

export default function CustomerTermsPage() {
  return (
    <article
      id="top"
      className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-10"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-brand text-xl text-[var(--color-oxblood)]">
          ChefMate
        </Link>
        <Link
          href="/legal"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-oxblood)]/25 px-3 text-sm font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/5"
        >
          <span aria-hidden="true">←</span> Legal Hub
        </Link>
      </div>

      <header className="rounded-2xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-oxblood)]/70">
            Binding Customer Agreement
          </p>
          <span className="rounded-full bg-[var(--color-oxblood)]/10 px-3 py-1 text-xs font-bold text-[var(--color-oxblood)]">
            Effective Date: 13 September 2026
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          Customer Terms and Conditions
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/80">
          These Terms and Conditions govern every Customer&apos;s access to and use of the Chef Mate
          platform, as well as every booking for personal chef services made through our
          marketplace. Please read them carefully before making a booking.
        </p>
      </header>

      <nav
        aria-label="Table of contents"
        className="mt-8 rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/40 p-5"
      >
        <h2 className="text-lg font-black text-[var(--color-charcoal)]">Table of Contents</h2>
        <ol className="mt-4 grid list-decimal gap-x-8 gap-y-2 pl-6 text-sm sm:grid-cols-2">
          {contents.map(([id, title]) => (
            <li key={id}>
              <a
                className="text-[var(--color-oxblood)] underline-offset-2 hover:underline"
                href={`#${id}`}
              >
                {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-12 text-sm leading-relaxed">
        <TermsSection id="introduction" number={1} title="Introduction and Scope">
          <Clause number="1.1">
            <p>
              These Customer Terms and Conditions (the <strong>Terms</strong>) constitute a binding
              legal contract between <strong>Chef Mate Proprietary Limited</strong>, a private
              company registered in South Africa under registration number 2026/593342/07 (
              <strong>Chef Mate</strong>, <strong>we</strong>, <strong>us</strong>, or{" "}
              <strong>our</strong>), and any natural or juristic person who accesses our platform,
              creates a customer account, or books personal chef services (<strong>Customer</strong>
              , <strong>you</strong>, or <strong>your</strong>).
            </p>
          </Clause>
          <Clause number="1.2">
            <p>
              By accessing, browsing, registering on, or placing a Booking through the CM Platform (
              <Link className="underline" href="https://chefmate.co.za">
                https://chefmate.co.za
              </Link>
              ), you confirm that you have read, understood, and voluntarily agree to be bound by
              these Terms and the incorporated CM Policies.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="cpa-notice" number={2} title="Consumer Protection Notice" risk>
          <Clause number="2.1">
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-red-950">
              <p className="font-bold">
                NOTICE UNDER SECTION 49 OF THE CONSUMER PROTECTION ACT 68 OF 2008 (CPA):
              </p>
              <p className="mt-2">
                These Terms contain clauses that limit or exclude Chef Mate&apos;s liability, impose
                responsibilities or indemnities on you, or require you to acknowledge certain facts.
                Clauses that may represent risk or limitation of rights are highlighted or set out
                in bold. Please pay particular attention to:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Clause 4: Platform role as an intermediary marketplace;</li>
                <li>
                  Clause 8: Customer cancellation ceilings and reasonable fee assessment rules;
                </li>
                <li>
                  Clause 11 &amp; 12: Responsibilities for kitchen safety, ingredient suitability,
                  and allergen disclosures;
                </li>
                <li>Clause 14: Limitation of liability and indemnities; and</li>
                <li>Clause 15: Dispute resolution procedures and AFSA mediation.</li>
              </ul>
            </div>
          </Clause>
          <Clause number="2.2">
            <p>
              No provision in these Terms is intended to unlawfully restrict, qualify, or exclude
              any mandatory statutory consumer rights you hold under the CPA, the Electronic
              Communications and Transactions Act 25 of 2002 (ECTA), the Protection of Personal
              Information Act 4 of 2013 (POPIA), or any other applicable law in the Republic of
              South Africa.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="definitions" number={3} title="Definitions and Interpretation">
          <Clause number="3.1">
            <p>In these Terms, the following terms have the meanings set out below:</p>
            <dl className="space-y-3">
              <Definition term="Applicable Laws">
                means the Constitution of the Republic of South Africa, the CPA, ECTA, POPIA, the
                Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972, municipal bylaws, and all
                other applicable statutes, regulations, standards, and binding court precedents in
                South Africa;
              </Definition>
              <Definition term="Booking">
                means a confirmed reservation made through the CM Platform for personal chef
                services to be provided by an independent Chef at a specified date, time, and
                Customer Premises;
              </Definition>
              <Definition term="Chef">
                means an independent culinary professional vetted and registered on the CM Platform
                who accepts Bookings to perform personal chef services;
              </Definition>
              <Definition term="CM Platform">
                means the Chef Mate website, mobile applications, web portals, APIs, and associated
                technology marketplace services operated by Chef Mate;
              </Definition>
              <Definition term="CM Policies">
                means collectively these Terms, the{" "}
                <Link className="underline" href="/legal/privacy">
                  Privacy Policy
                </Link>
                , the{" "}
                <Link className="underline" href="/legal/platform-rules">
                  Platform Rules
                </Link>
                , the{" "}
                <Link className="underline" href="/legal/complaints-handling">
                  Complaints Handling Process
                </Link>
                , the{" "}
                <Link className="underline" href="/legal/review-and-ratings">
                  Review and Ratings Policy
                </Link>
                , and the{" "}
                <Link className="underline" href="/legal/paia-manual">
                  PAIA Manual
                </Link>
                ;
              </Definition>
              <Definition term="Customer Premises">
                means the private residential or specified kitchen venue designated by the Customer
                where the Chef performs the Services;
              </Definition>
              <Definition term="Primary Chef">
                means the specific Chef selected by a Customer in connection with a multi-session
                Subscription Package;
              </Definition>
              <Definition term="Services">
                means the personal chef services performed by the Chef, including meal planning,
                in-kitchen food preparation, cooking, plating, and basic kitchen clean-up as
                specified in the Booking;
              </Definition>
              <Definition term="Subscription Package">
                means a multi-session recurring or fixed-term booking plan offered by Chef Mate
                enabling a Customer to book recurring chef visits over a designated period;
              </Definition>
              <Definition term="Substitute Chef">
                means an alternative verified Chef proposed by Chef Mate and expressly accepted by
                the Customer when the originally assigned Chef is unavailable;
              </Definition>
              <Definition term="Total Price">
                means the total price payable by the Customer for a Booking, including the Chef Fee,
                platform facilitation fee, and applicable taxes.
              </Definition>
            </dl>
          </Clause>
        </TermsSection>

        <TermsSection id="platform-role" number={4} title="Platform Role and Nature of Services">
          <Clause number="4.1">
            <p>
              Chef Mate operates an online technology marketplace that enables Customers to
              discover, book, communicate with, and pay independent third-party Chefs for private
              personal-chef sessions.
            </p>
          </Clause>
          <Clause number="4.2">
            <p className="font-semibold text-[var(--color-charcoal)]">
              Chef Mate does not itself prepare or cook meals, nor does it employ Chefs. Each Chef
              operates as an independent service provider who directly enters into an engagement
              with you for the physical execution of the culinary Services.
            </p>
          </Clause>
          <Clause number="4.3">
            <p>
              Chef Mate remains responsible for its own platform operations, vetting standards,
              payment collection, customer care, and compliance with statutory intermediary
              obligations that cannot lawfully be excluded.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="eligibility-account"
          number={5}
          title="Account Registration and Eligibility"
        >
          <Clause number="5.1">
            <p>To register for an account and make Bookings on the CM Platform, you must:</p>
            <ol className={alphaListClass}>
              <li>
                be at least 18 years of age and possess full legal capacity to enter into binding
                contracts;
              </li>
              <li>
                provide accurate, truthful, and current personal, contact, and address information;
              </li>
              <li>
                maintain the confidentiality of your account credentials and immediately notify us
                of any unauthorised access.
              </li>
            </ol>
          </Clause>
          <Clause number="5.2">
            <p>
              You are responsible for all activities and Bookings initiated under your account
              unless you have notified us in writing of a compromise prior to the unauthorised
              activity.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="booking-process" number={6} title="Booking Process and Confirmation">
          <Clause number="6.1">
            <p>
              When you submit a Booking request on the CM Platform, your request constitutes an
              offer to engage the selected Chef for the specified menu, date, time, and location.
            </p>
          </Clause>
          <Clause number="6.2">
            <p>
              A Booking is legally confirmed only when: (a) the selected Chef accepts the request;
              and (b) the required payment or pre-authorisation is successfully processed through
              our payment gateway.
            </p>
          </Clause>
          <Clause number="6.3">
            <p>
              Every confirmed Booking establishes the specific Chef, date, session window, menu
              plan, guest count, and Total Price. No substitute Chef will ever be dispatched to your
              premises without your express prior consent.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="pricing-payment" number={7} title="Pricing, Payment, and Inclusions">
          <Clause number="7.1">
            <p>
              The Total Price for a Booking is clearly displayed before you confirm your
              reservation. All prices are quoted in South African Rand (ZAR) and are inclusive of
              VAT where applicable.
            </p>
          </Clause>
          <Clause number="7.2">
            <p className="font-semibold text-[var(--color-charcoal)]">
              Ingredient Sourcing: Unless explicitly stated in a premium package or separate written
              arrangement, standard Chef Mate Bookings cover personal chef preparation and cooking
              labor only. You are responsible for purchasing and supplying all necessary ingredients
              and consumables in accordance with the agreed menu plan and recipe specifications.
            </p>
          </Clause>
          <Clause number="7.3">
            <p>
              Payments are collected securely through our registered third-party payment gateway. By
              confirming a Booking, you authorise Chef Mate to charge the designated payment method
              for the Total Price and any agreed add-ons.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="cancellations-refunds"
          number={8}
          title="Cancellations, Rescheduling, and Refunds"
        >
          <Clause number="8.1">
            <p>
              You may cancel a confirmed Booking at any time prior to the scheduled start time by
              submitting a cancellation request through the CM Platform or contacting customer
              support.
            </p>
          </Clause>
          <Clause number="8.2">
            <p>
              In compliance with Section 17(3)–(4) of the CPA, Chef Mate applies reasonable
              cancellation charge ceilings based on the timing of cancellation and the reasonable
              ability to reallocate the Chef&apos;s reserved schedule:
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-oxblood)]/15">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--color-warm-cream)] font-bold text-[var(--color-oxblood)]">
                  <tr>
                    <th className="p-3">Notice Window</th>
                    <th className="p-3">Maximum Cancellation Charge</th>
                    <th className="p-3">Refund Entitlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-oxblood)]/10 text-[var(--color-charcoal)]/80">
                  <tr>
                    <td className="p-3 font-semibold">More than 24 hours before session</td>
                    <td className="p-3">0% (No charge)</td>
                    <td className="p-3 font-semibold text-emerald-700">100% Full Refund</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Between 6 and 24 hours before session</td>
                    <td className="p-3">Up to 50% of Total Price</td>
                    <td className="p-3 font-semibold text-amber-700">Minimum 50% Refund</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">
                      Less than 6 hours before session / No-Show
                    </td>
                    <td className="p-3">Up to 100% of Total Price</td>
                    <td className="p-3 font-semibold text-red-700">
                      Subject to individual assessment
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Clause>
          <Clause number="8.3">
            <p>
              <strong>Individual Reasonableness Assessment:</strong> The applicable band is only a
              ceiling. Chef Mate will assess the final charge individually and it must be reasonable
              under section 17 of the Consumer Protection Act 68 of 2008, taking into account: (a)
              diligent efforts made to find replacement bookings; (b) costs saved or avoided as a
              result of cancellation; and (c) verifiable customer emergencies.
            </p>
          </Clause>
          <Clause number="8.4">
            <p className="font-semibold text-[var(--color-charcoal)]">
              No cancellation fee shall be imposed if the Customer or booked beneficiary is unable
              to proceed due to death or hospitalisation, upon submission of reasonable
              verification.
            </p>
          </Clause>
          <Clause number="8.5">
            <p>
              <strong>Refund Initiation:</strong> Where a refund is approved, Chef Mate will
              initiate the electronic refund instruction to our payment gateway within{" "}
              <strong>5 Business Days</strong> of confirmation. Actual reflection in your bank
              account depends on standard interbank processing times.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="chef-inability"
          number={9}
          title="Chef Inability to Perform and Substitutions"
        >
          <Clause number="9.1">
            <p>
              If the confirmed Chef or Chef Mate cannot supply the agreed Services, you remain
              entitled to the full statutory monetary remedy, including prescribed interest where
              applicable.
            </p>
          </Clause>
          <Clause number="9.2">
            <p>In such circumstances, you have the absolute right to choose between:</p>
            <ol className={alphaListClass}>
              <li>
                a full monetary refund of all amounts paid for the affected session, processed
                promptly;
              </li>
              <li>
                rescheduling the session to a mutually convenient date and time with the same Chef;
                or
              </li>
              <li>
                accepting a comparable, vetted <strong>Substitute Chef</strong> proposed by Chef
                Mate.
              </li>
            </ol>
          </Clause>
          <Clause number="9.3">
            <p className="font-semibold text-[var(--color-charcoal)]">
              No Silent Replacement: A Substitute Chef is appointed only after you expressly accept
              that Chef in writing or via the CM Platform. Declining a proposed substitute will
              never compromise your entitlement to your monetary remedy.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="subscription-terms"
          number={10}
          title="Subscription Packages and Multi-Session Terms"
        >
          <Clause number="10.1">
            <p>
              Chef Mate may offer Subscription Packages providing Customers with recurring weekly or
              monthly chef sessions with a dedicated <strong>Primary Chef</strong>.
            </p>
          </Clause>
          <Clause number="10.2">
            <p>Fixed-term subscription packages comply with Section 14 of the CPA:</p>
            <ol className={alphaListClass}>
              <li>
                The initial term shall not exceed 24 months unless an extended period is expressly
                agreed to and justifiable;
              </li>
              <li>
                You may cancel a fixed-term package at any time by providing{" "}
                <strong>20 Business Days&apos; written notice</strong>, subject only to a reasonable
                cancellation charge assessed under CPA Regulation 5;
              </li>
              <li>
                Chef Mate will notify you in writing between{" "}
                <strong>80 and 40 Business Days</strong> before the expiry of any fixed-term
                subscription detailing upcoming expiry and renewal options.
              </li>
            </ol>
          </Clause>
          <Clause number="10.3">
            <p>
              If your assigned Primary Chef is temporarily unavailable for a session in a
              Subscription Package, the substitution and refund protections in Clause 9 apply to
              that individual session.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="customer-responsibilities"
          number={11}
          title="Customer Responsibilities and Kitchen Safety"
        >
          <Clause number="11.1">
            <p>As a Customer hosting a Chef session at your premises, you agree to:</p>
            <ol className={alphaListClass}>
              <li>provide a safe, sanitary, clean, and reasonably equipped kitchen environment;</li>
              <li>
                ensure functional primary utilities, including hot running water, electricity,
                working stovetop, oven, and refrigeration;
              </li>
              <li>
                provide basic cookware, pots, pans, cutting boards, and dinnerware unless
                specialized equipment is agreed in writing;
              </li>
              <li>
                supply fresh, unexpired, wholesome ingredients matching the agreed recipe
                quantities;
              </li>
              <li>
                disclose any premises hazards, access controls, gate codes, security protocols, and
                domestic pets;
              </li>
              <li>ensure an adult (18+) is present or contactable throughout the session.</li>
            </ol>
          </Clause>
          <Clause number="11.2">
            <p className="font-semibold text-red-950">
              Right to Suspend Unsafe Sessions: A Chef has the right to refuse or immediately stop
              work if the kitchen environment is demonstrably unsafe, unsanitary, abusive, or poses
              an imminent threat to personal health or safety.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="allergies-food-safety"
          number={12}
          title="Food Safety, Allergies, and Dietary Requirements"
        >
          <Clause number="12.1">
            <p>
              You must disclose all known food allergies, severe intolerances, dietary restrictions,
              or medical dietary requirements for yourself and all dining guests during the booking
              process and confirm them directly with the Chef before cooking begins.
            </p>
          </Clause>
          <Clause number="12.2">
            <p>
              While Chefs exercise professional hygiene and take reasonable precautions to prevent
              cross-contamination, you acknowledge that preparation occurs within your private
              residential kitchen using customer-supplied cookware. Chef Mate and the Chef cannot
              guarantee an absolute allergen-free environment.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="cooling-off" number={13} title="Cooling-Off Rights (ECTA)">
          <Clause number="13.1">
            <p>
              Under Section 44 of ECTA, a consumer is generally entitled to a 7-day cooling-off
              cancellation period for electronic transactions without penalty.
            </p>
          </Clause>
          <Clause number="13.2">
            <p>
              In terms of Section 42(2) of ECTA, this cooling-off right does not apply to
              transactions for services that have begun with the consumer&apos;s consent before the
              end of the 7-day period, or contracts for the provision of accommodation, transport,
              catering, or leisure services on a specific date. Cancellations are governed by the
              provisions of Clause 8.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="liability-indemnities"
          number={14}
          title="Limitation of Liability and Indemnities"
          risk
        >
          <Clause number="14.1">
            <p className="font-bold text-red-950">
              To the maximum extent permitted by South African law, Chef Mate, its directors,
              employees, and agents shall not be liable for any indirect, incidental, special, or
              consequential damages, loss of profits, or data loss arising from or relating to your
              use of the platform.
            </p>
          </Clause>
          <Clause number="14.2">
            <p>
              Chef Mate shall not be liable for acts, omissions, property damage, or physical injury
              caused by an independent Chef outside Chef Mate&apos;s own direct negligence, nor for
              losses resulting from defective customer-supplied equipment, spoiled customer
              ingredients, or undisclosed allergens.
            </p>
          </Clause>
          <Clause number="14.3">
            <p>
              <strong>Non-Excludable Statutory Rights:</strong> Nothing in these Terms excludes or
              limits liability for gross negligence, willful misconduct, fraud, death or personal
              injury where exclusion is prohibited by law, or statutory liability for unsafe goods
              or services under Section 61 of the CPA.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="dispute-resolution"
          number={15}
          title="Dispute Resolution and AFSA Mediation"
        >
          <Clause number="15.1">
            <p>
              If a dispute arises between you and Chef Mate or between you and a Chef, you are
              encouraged to first submit a complaint via our{" "}
              <Link className="underline" href="/legal/complaints-handling">
                Complaints Handling Process
              </Link>{" "}
              at{" "}
              <a className="font-semibold underline" href="mailto:support@chefmate.co.za">
                support@chefmate.co.za
              </a>
              .
            </p>
          </Clause>
          <Clause number="15.2">
            <p>
              If the dispute cannot be resolved through internal support within 14 Business Days,
              either Party may refer the dispute to mediation administered by the{" "}
              <strong>Arbitration Foundation of Southern Africa (AFSA)</strong> in Johannesburg in
              accordance with the AFSA Commercial Mediation Rules.
            </p>
          </Clause>
          <Clause number="15.3">
            <p>
              Nothing in this clause prevents either Party from seeking urgent interdictory relief
              from a court of competent jurisdiction, or from lodging a formal complaint with the
              National Consumer Commission (NCC), the Consumer Goods and Services Ombud (CGSO), or
              the Information Regulator.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="general"
          number={16}
          title="General Provisions, Amendments, and Contact Details"
        >
          <Clause number="16.1">
            <p>
              <strong>Governing Law:</strong> These Terms and any dispute arising from them are
              governed by and construed in accordance with the laws of the Republic of South Africa.
            </p>
          </Clause>
          <Clause number="16.2">
            <p>
              <strong>Severability:</strong> If any provision of these Terms is held to be invalid,
              unlawful, or unenforceable, that provision shall be severed from the remaining
              provisions, which shall continue in full force and effect.
            </p>
          </Clause>
          <Clause number="16.3">
            <p>
              <strong>Amendments:</strong> Chef Mate reserves the right to update or modify these
              Terms from time to time. Registered Customers will be notified of material changes
              with at least 14 days&apos; notice. Continued use of the platform following the
              effective date constitutes acceptance.
            </p>
          </Clause>
          <Clause number="16.4">
            <p>
              <strong>Contact Details:</strong> For any questions, notifications, or legal
              inquiries, please contact Chef Mate at:
            </p>
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4">
              <p className="font-bold text-[var(--color-charcoal)]">
                Chef Mate Proprietary Limited
              </p>
              <p className="text-xs text-[var(--color-charcoal)]/70">
                Registration Number: 2026/593342/07
              </p>
              <p className="mt-2 text-xs">
                <strong>Physical Address:</strong> 97 Waterfall Avenue, Craighall, Johannesburg,
                Gauteng, 2196, South Africa
              </p>
              <p className="text-xs">
                <strong>Customer Support:</strong>{" "}
                <a className="underline" href="mailto:support@chefmate.co.za">
                  support@chefmate.co.za
                </a>
              </p>
              <p className="text-xs">
                <strong>Legal &amp; Privacy:</strong>{" "}
                <a className="underline" href="mailto:privacy@chefmate.co.za">
                  privacy@chefmate.co.za
                </a>
              </p>
            </div>
          </Clause>
        </TermsSection>
      </div>
    </article>
  );
}
