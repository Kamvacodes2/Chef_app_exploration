import type { ReactNode } from "react";
import Link from "next/link";

const TERMS_VERSION = "2026-08-18";

const contents = [
  ["introduction", "Introduction"],
  ["consumer-protection-notice", "Consumer Protection Notice"],
  ["definitions", "Definitions and Interpretation"],
  ["relationship", "Nature of the Relationship"],
  ["platform-access", "Platform Access"],
  ["booking-process", "Booking Process"],
  ["pricing-model", "Pricing Model"],
  ["payment", "Payment"],
  ["cancellations", "Cancellations and Refunds"],
  ["professional-standards", "Professional Standards"],
  ["ratings", "Ratings and Review"],
  ["data-protection", "Data Protection"],
  ["insurance", "Insurance"],
  ["liability", "Limitation of Liability"],
  ["indemnities", "Indemnities"],
  ["non-circumvention", "Non-Circumvention"],
  ["suspension", "Suspension and Termination"],
  ["complaints", "Complaints Handling"],
  ["taxes", "Taxes"],
  ["general", "General"],
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
      <div className="mt-4 space-y-4 text-[var(--color-charcoal)]/75">{children}</div>
    </section>
  );
}

function Clause({ number, children }: { readonly number: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[3rem_1fr] sm:gap-3">
      <span className="font-semibold text-[var(--color-charcoal)]/45">{number}</span>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

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

function Definition({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--color-oxblood)]/8 pb-3 last:border-0">
      <dt className="font-bold text-[var(--color-charcoal)]">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const alphaListClass = "list-[lower-alpha] space-y-2 pl-6";

export default function ChefAgreementPage() {
  return (
    <article
      id="top"
      className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-10"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-brand text-xl text-[var(--color-oxblood)]">
          ChefMate
        </Link>
        <ReturnToAcceptance />
      </div>

      <header className="rounded-2xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-oxblood)]/70">
          Binding terms
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          Terms and Conditions for Chefs
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/70">
          Version {TERMS_VERSION} · Effective 18 August 2026
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/70">
          These binding Terms govern every Chef&apos;s access to and use of the Chef Mate platform.
          The service currently supports once-off Bookings. Clauses concerning a Subscription
          Package apply only if Chef Mate later expressly offers a package and a Customer activates
          it.
        </p>
      </header>

      <nav
        aria-label="Terms contents"
        className="mt-10 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
      >
        <h2 className="text-lg font-black text-[var(--color-charcoal)]">Contents</h2>
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
        <TermsSection id="introduction" number={1} title="Introduction">
          <Clause number="1.1">
            <p>
              These Terms and Conditions for Chefs (the Terms) are a binding legal agreement that
              govern the relationship between:
            </p>
            <ol className={alphaListClass}>
              <li>
                Chef Mate Proprietary Limited, a company registered in accordance with the laws of
                South Africa under registration number 2026/593342/07 (Chef Mate or we or us or
                our); and
              </li>
              <li>
                any natural person who uses Chef Mate&apos;s website, application, or other
                platforms to independently offer personal chef services to the public (Chef or you
                or your).
              </li>
            </ol>
            <p>(each, the Party, and collectively, the Parties).</p>
          </Clause>
        </TermsSection>

        <TermsSection
          id="consumer-protection-notice"
          number={2}
          title="Consumer Protection Notice"
          risk
        >
          <Clause number="2.1">
            <p className="font-bold text-red-950">These Terms contain clauses which:</p>
            <ol className={`${alphaListClass} font-bold text-red-950`}>
              <li>limit or exclude our risk or liability;</li>
              <li>limit or exclude your rights and remedies against us;</li>
              <li>place various risks and liabilities on you; or</li>
              <li>
                require you to acknowledge and voluntarily agree with certain statements of fact.
              </li>
            </ol>
          </Clause>
          <Clause number="2.2">
            <p className="font-bold text-red-950">
              You must pay special attention to all the clauses in these Terms, especially those in
              bold, as they may result in you giving up rights to bring claims against us and other
              parties for certain losses, liabilities or damages. We may also have claims against
              you and hold you responsible to repay us further amounts, including costs or damages
              that we may otherwise have to pay.
            </p>
          </Clause>
          <Clause number="2.3">
            <p>
              To the extent that the relationship between you and Chef Mate is governed by
              Applicable Laws, including the CPA, no provision of these Terms is intended to breach
              such Applicable Laws. Therefore, all provisions of these Terms must be treated as
              limited, to the extent necessary, to ensure such compliance with Applicable Laws.
            </p>
          </Clause>
          <Clause number="2.4">
            <p>
              These Terms must be read together with the other terms, policies, rules, and other
              documents that govern the use of the CM Platform, including but not limited to:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <Link className="underline" href="/legal/customer-terms">
                  Terms and Conditions for Customers
                </Link>
                ;
              </li>
              <li>
                <Link className="underline" href="/legal/privacy">
                  Privacy Policy
                </Link>
                ;
              </li>
              <li>
                <Link className="underline" href="/legal/platform-rules">
                  Platform Rules
                </Link>
                ;
              </li>
              <li>
                <Link className="underline" href="/legal/complaints-handling">
                  Complaints Handling Process
                </Link>
                ; and
              </li>
              <li>
                <Link className="underline" href="/legal/review-and-ratings">
                  Review and Ratings Policy
                </Link>
                ,
              </li>
            </ul>
            <p>(collectively, the CM Policies).</p>
            <p>
              The CM Policies, to the extent applicable, collectively constitute the contract
              regulating the relationship between you and Chef Mate.
            </p>
          </Clause>
          <Clause number="2.5">
            <p>
              By accessing, using, registering on, or continuing to use the CM Platform, you
              acknowledge that you have read and understood all of the CM Policies that are
              applicable to you, including these Terms, and voluntarily agree to be bound by them.
            </p>
          </Clause>
          <Clause number="2.6">
            <p>
              To the extent there is any inconsistency between these Terms and any Applicable Laws,
              the Applicable Laws shall prevail.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="definitions" number={3} title="Definitions and Interpretation">
          <Clause number="3.1">
            <p>
              In these Terms, the following words and phrases shall have the meanings assigned to
              them, unless the context requires otherwise:
            </p>
            <dl className="space-y-3">
              <Definition term="Applicable Fees">
                means any fees, charges, or costs payable by you under these Terms or any CM
                Policies, including but not limited to the Commission, transaction fees, and
                administrative charges, as determined and published by us from time to time;
              </Definition>
              <Definition term="Applicable Laws">
                means any national legislation, statutes, ordinances, and other laws and regulations
                and any by-laws of any legal constituted public authority, including but not limited
                to: (1) any applicable statute or proclamation or any delegated or subordinate
                legislation; (2) any common law and any applicable judgment of a relevant court of
                law that is a binding precedent; and (3) any regulation, rule, condition, direction,
                decision, notice, notification, guideline, code of practice, decree, circular,
                decision, or other requirement, directive or order made by any regulatory authority
                or regulatory body or other legally constituted public authority (including any
                enforcement action, direction, or fine made or levied) whether or not expressed to
                be legally binding; in each case in force at any time in South Africa;
              </Definition>
              <Definition term="Authority">
                means any government, regulatory, or statutory body or authority, whether national,
                provincial, or local, having jurisdiction over the subject matter of these Terms;
              </Definition>
              <Definition term="Booking">
                means a confirmed engagement between a Chef and a Customer for the provision of
                Services at a specified date, time, and location, whether as a once-off booking or
                as a single session forming part of a Subscription Package;
              </Definition>
              <Definition term="Business Day">
                means any day other than a Saturday, Sunday, or official public holiday in South
                Africa;
              </Definition>
              <Definition term="Cancellation Fee">
                means the fee charged to you in the event that you cancel a Booking, as set out in
                the cancellation provisions of these Terms;
              </Definition>
              <Definition term="Chef Fee">
                means the portion of the Total Price payable to the Chef after deduction of the
                Commission and any other Applicable Fees;
              </Definition>
              <Definition term="CM Account">
                means the registered account created by you on the CM Platform for the purpose of
                offering and managing the Services;
              </Definition>
              <Definition term="CM Platform">
                means the website (
                <Link className="underline" href="https://chefmate.co.za">
                  https://chefmate.co.za
                </Link>
                ), application, or any other platform offered and operated by Chef Mate that enables
                Chefs to offer the Services;
              </Definition>
              <Definition term="CM Policies">
                means collectively, these Terms, the Terms and Conditions for Customers, the Privacy
                Policy, the Platform Rules, the Complaints Handling Process, the Review and Ratings
                Policy, and other standards, codes, and rules governing your use of the CM Platform
                or your relationship with us, as amended from time to time;
              </Definition>
              <Definition term="Commission">
                means the percentage of the Total Price payable to Chef Mate in respect of each
                Fulfilled Booking, as determined and published by us from time to time, currently
                being 35% of the Total Price;
              </Definition>
              <Definition term="CPA">
                means the Consumer Protection Act 68 of 2008 and its regulations issued thereunder;
              </Definition>
              <Definition term="Customer">
                means the natural person registered as such on the CM Platform who engages, or seeks
                to engage, a Chef for the provision of Services;
              </Definition>
              <Definition term="Customer Personal Information">
                means Personal Information relating to Customers;
              </Definition>
              <Definition term="Customer Premises">
                means the location specified by the Customer in the Booking for the performance of
                the Services, including all facilities, equipment, utensils, and other property at
                those premises made available to the Chef;
              </Definition>
              <Definition term="Foodstuffs Act">
                means the Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972 and its regulations
                issued thereunder;
              </Definition>
              <Definition term="Force Majeure">
                means any event or circumstance beyond the reasonable control of a Party, including
                but not limited to natural disasters, epidemics, pandemics, civil unrest, war,
                terrorism, government action, power failures, internet or telecommunications
                failures, or any event that could not have been reasonably foreseen or prevented;
              </Definition>
              <Definition term="Fulfilled Booking">
                means a Booking in respect of which the Chef has performed the Services to
                completion in accordance with these Terms;
              </Definition>
              <Definition term="Hygiene Regulations">
                means the Regulations Governing General Hygiene Requirements for Food Premises, the
                Transport of Food and Related Matters, 2018 published under the Foodstuffs Act;
              </Definition>
              <Definition term="Payout">
                means the payment of the Chef Fee to you by Chef Mate following a Fulfilled Booking,
                less any deductions authorised under these Terms;
              </Definition>
              <Definition term="Personal Information">
                has the meaning stipulated in POPIA;
              </Definition>
              <Definition term="Platform Rules">
                means the rules governing conduct on the CM Platform, as published and amended by
                Chef Mate from time to time and available at{" "}
                <Link className="underline" href="/legal/platform-rules">
                  https://chefmate.co.za/legal/platform-rules
                </Link>
                ;
              </Definition>
              <Definition term="POPIA">
                means the Protection of Personal Information Act 4 of 2013 and its regulations
                issued thereunder;
              </Definition>
              <Definition term="Primary Chef">
                means the Chef selected by a Customer in connection with a Subscription Package,
                being the Chef expected to fulfil all Bookings under that Subscription Package
                unless a substitute is arranged in accordance with these Terms;
              </Definition>
              <Definition term="Privacy Policy">
                means Chef Mate&apos;s privacy policy, as amended from time to time and available at{" "}
                <Link className="underline" href="/legal/privacy">
                  https://chefmate.co.za/legal/privacy
                </Link>
                ;
              </Definition>
              <Definition term="Restricted Period">
                means a period of 12 months from the date on which you last provided Services to a
                Customer through the CM Platform;
              </Definition>
              <Definition term="Services">
                means the personal chef services offered by the Chef to the Customers through the CM
                Platform, including meal planning, meal preparation, cooking, and related services
                as described in the relevant Booking;
              </Definition>
              <Definition term="Subscription Package">
                means a package offered by Chef Mate on the CM Platform that provides a Customer
                with access to multiple Bookings over a specified period, linked to a Primary Chef
                selected by the Customer;
              </Definition>
              <Definition term="Substitute Chef">
                means a Chef arranged by Chef Mate to fulfil a Booking in place of the originally
                assigned Chef or Primary Chef, in accordance with the cancellation provisions in
                clause 9 of these Terms;
              </Definition>
              <Definition term="Total Price">
                means the total amount payable by a Customer in respect of a Booking, as determined
                and published by Chef Mate on the CM Platform, inclusive of VAT where applicable;
              </Definition>
              <Definition term="VAT">
                means value-added tax levied in terms of the VAT Act;
              </Definition>
              <Definition term="VAT Act">
                means the Value-Added Tax Act 89 of 1991 and its regulations issued thereunder;
              </Definition>
            </dl>
          </Clause>
        </TermsSection>

        <TermsSection id="relationship" number={4} title="Nature of the Relationship">
          <Clause number="4.1">
            <p>
              As a Chef using the CM Platform, you are not an employee, agent, joint venturer, or
              partner of Chef Mate.
            </p>
          </Clause>
          <Clause number="4.2">
            <p>
              You are an independent service provider entering into direct contractual relationships
              with Customers, and you are entirely responsible for the quality, legality, and
              execution of the Services.
            </p>
          </Clause>
          <Clause number="4.3">
            <p>
              Chef Mate is not a party to the contract between Chefs and Customers for the provision
              of Services. Chef Mate&apos;s role is to operate and administer the CM Platform,
              including facilitating introductions between Chefs and Customers, managing Bookings,
              establishing and administering pricing, processing payments, providing communication
              tools, and administering complaints. The establishment and administration of pricing
              by Chef Mate is a marketplace governance function and does not constitute operational
              control over, or supervision of, the manner in which you perform the Services.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="platform-access" number={5} title="Platform Access">
          <Clause number="5.1">
            <p>
              Access to the CM Platform is subject to the initial application and ongoing
              verification process administered by us as set out below.
            </p>
          </Clause>
          <Clause number="5.2">
            <p>
              In order to access the CM Platform, you must meet the following eligibility criteria:
            </p>
            <ol className={alphaListClass}>
              <li>You must be at least 18 years old;</li>
              <li>
                You must hold a culinary qualification from a registered institution or possess
                sufficient verifiable cooking experience, as determined by us;
              </li>
              <li>
                You must be adequately trained in the principles and practices of food safety and
                hygiene, including the Applicable Laws, by a facility or institution accredited by
                the Quality Council for Trades and Occupations to do so, and to keep such training
                current; and
              </li>
              <li>You must undergo a criminal record check.</li>
            </ol>
          </Clause>
          <Clause number="5.3">
            <p>
              Once initial access to the CM Platform has been granted, we may conduct ongoing audits
              to ensure that Chefs continue to meet the eligibility criteria, which may include
              reverification of qualifications, certifications, or criminal record checks.
            </p>
          </Clause>
          <Clause number="5.4">
            <p>
              You agree to cooperate fully with us during the initial application and ongoing
              verification process, including but not limited to:
            </p>
            <ol className={alphaListClass}>
              <li>
                accurately and completely disclosing relevant information and documentation,
                including your full name, contact and address details, background, criminal history,
                professional conduct, and relevant licences, certifications, and qualifications, as
                may be requested by us from time to time;
              </li>
              <li>updating your contact details on your CM Account; and</li>
              <li>
                promptly notifying us of any material change in your circumstances that may affect
                your ability to meet the eligibility criteria or your continued compliance with
                these Terms.
              </li>
            </ol>
          </Clause>
          <Clause number="5.5">
            <p>
              The processing of your personal information during the application and ongoing
              verification process is subject to our{" "}
              <Link className="underline" href="/legal/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </Clause>
          <Clause number="5.6">
            <p>
              Meeting the eligibility criteria does not create an unconditional right to access the
              CM Platform. We retain the discretion to approve, reject, or restrict your access to
              the CM Platform for any lawful reason, including but not limited to: (1) failing to
              keep food safety and hygiene training certifications current; and (2) providing false
              or misleading information.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="booking-process" number={6} title="Booking Process">
          <Clause number="6.1">
            <p>
              When a Customer requests a Booking on the CM Platform, you have 15 minutes to accept
              or decline the Booking.
            </p>
          </Clause>
          <Clause number="6.2">
            <p>
              As an independent service provider using the CM Platform, you have complete discretion
              whether to accept or decline a Booking. We do not impose any mandatory minimum
              Bookings. You will not be penalised for declining a Booking.
            </p>
          </Clause>
          <Clause number="6.3">
            <p>
              You may pause your profile on the CM Platform at any time, during which period you
              will not receive new Booking requests. We reserve the right to deactivate or remove
              profiles that have been inactive for a continuous period of 3 months, subject to
              reasonable prior notice to you.
            </p>
          </Clause>
          <Clause number="6.4">
            <p>
              A Booking is confirmed when: (1) you accept the Booking; and (2) the Customer makes
              payment for the Booking.
            </p>
          </Clause>
          <Clause number="6.5">
            <p>
              Once a Booking is confirmed, you and the Customer are bound to the Booking. This means
              that you must either: (1) fulfil the Booking; or (2) cancel the Booking in accordance
              with the cancellation provisions set out in clause 9 of these Terms.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="pricing-model" number={7} title="Pricing Model">
          <Clause number="7.1">
            <p>
              The CM Platform is a structured marketplace operated by Chef Mate. In order to promote
              Customer confidence, transparency, consistency, and ease of booking on the CM
              Platform, we shall determine the pricing applicable to Services offered by Chefs using
              the CM Platform.
            </p>
          </Clause>
          <Clause number="7.2">
            <p>
              The Total Price applicable to any Booking shall be determined by us and published on
              or through the CM Platform from time to time.
            </p>
          </Clause>
          <Clause number="7.3">
            <p>
              The Total Price may vary based on factors including the duration of the Service, the
              location of the Booking, the complexity of the Service, subscription offerings,
              promotional campaigns, seasonal demand, and any other factors reasonably determined by
              Chef Mate.
            </p>
          </Clause>
          <Clause number="7.4">
            <p>
              We may offer Subscription Packages which provide Customers with access to multiple
              Bookings over a specified period at a discounted rate. Different Subscription Packages
              may carry different pricing structures, including different discounted rates. The
              value of a Booking performed pursuant to a Subscription Package may differ from the
              value of a once-off Booking.
            </p>
          </Clause>
          <Clause number="7.5">
            <p>
              By accepting a Booking using the CM Platform, you agree to provide the Services at the
              Total Price displayed on the CM Platform at the time the Booking is confirmed.
            </p>
          </Clause>
          <Clause number="7.6">
            <p>
              If you do not agree with the Total Price, your remedy is to (1) decline the Booking;
              or (2) discontinue use of the CM Platform.
            </p>
          </Clause>
          <Clause number="7.7">
            <p>
              Nothing in these Terms shall be construed as guaranteeing that you will receive any
              minimum number of Bookings, revenue, or Payouts. Your Payouts remain dependent upon,
              among other things, the number of Bookings accepted and fulfilled by you.
            </p>
          </Clause>
          <Clause number="7.8">
            <p>
              We may introduce, modify, withdraw, or administer promotional campaigns, discounts,
              Subscription Packages, loyalty benefits, referral incentives, pricing categories,
              dynamic pricing structures, and other marketplace pricing mechanisms without your
              prior consent, provided that the Total Price applicable to a Booking is disclosed to
              you before you accept the relevant Booking.
            </p>
          </Clause>
          <Clause number="7.9">
            <p>
              The establishment of pricing by Chef Mate shall not create an employment relationship
              between you and Chef Mate, or otherwise alter your status as an independent service
              provider.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="payment" number={8} title="Payment">
          <Clause number="8.1">
            <p>
              You hereby appoint Chef Mate as your payment collection agent solely for the limited
              purpose of accepting and processing funds from Customers on your behalf.
            </p>
          </Clause>
          <Clause number="8.2">
            <p>
              You acknowledge that payment made by a Customer through the CM Platform shall be
              considered the same as a payment made by the Customer directly to you, and you will
              provide the Services to the Customer as if you have received payment directly from the
              Customer.
            </p>
          </Clause>
          <Clause number="8.3">
            <p>
              All Customer payments are processed through our payment gateway. We usually collect
              the Total Price at the time the Booking request is accepted by you, unless otherwise
              noted.
            </p>
          </Clause>
          <Clause number="8.4">
            <p>We charge a Commission in respect of each Fulfilled Booking.</p>
          </Clause>
          <Clause number="8.5">
            <p>
              You acknowledge that Chef Mate is entitled to determine the value of the Commission
              from time to time without your prior consent, provided that Chef Mate takes reasonable
              steps to notify you of any changes in the value of the Commission.
            </p>
          </Clause>
          <Clause number="8.6">
            <p>
              The value of your Payout is the Total Price less the Commission and any other
              Applicable Fees.
            </p>
          </Clause>
          <Clause number="8.7">
            <p>
              Payouts are made on a weekly basis. We may temporarily suspend any Payout for the
              purposes of, among other things: (1) preventing unlawful activity or fraud; (2)
              completing an investigation into an alleged contravention of these Terms or other
              terms, policies, or rules; or (3) as required for compliance with our obligations
              under Applicable Laws.
            </p>
          </Clause>
          <Clause number="8.8">
            <p>
              In order to receive a Payout, you must provide us with accurate and current bank
              account details. We may request additional information from you from time to time in
              order to meet the requirements of Applicable Laws or the requirements of our payments
              processing service provider. Failing to provide the requested information may result
              in us temporarily suspending a Payout until the requested information is provided,
              and, if necessary, validated.
            </p>
          </Clause>
          <Clause number="8.9">
            <p>
              We process your banking details and other information for the purpose of effecting a
              Payout in accordance with our{" "}
              <Link className="underline" href="/legal/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </Clause>
          <Clause number="8.10">
            <p>
              It is your responsibility to ensure that your banking details are accurate, complete,
              and current. We will not be responsible for any loss suffered by you as a result of
              incorrect, outdated, or incomplete information provided by you.
            </p>
          </Clause>
          <Clause number="8.11">
            <p>
              Our obligation to effect a Payout is subject to and conditional upon successful
              receipt of the payment of the Total Price from the Customer.
            </p>
          </Clause>
          <Clause number="8.12">
            <p>
              You authorise us to collect from you certain amounts due pursuant to these Terms or
              any of the other CM Policies by withholding the amount from your future Payout,
              including but not limited to any amounts already paid to you in respect of a Booking
              that has been cancelled in accordance with the cancellation provisions set out in
              clause 9 of these Terms. Where a refund is due to a Customer in accordance with these
              Terms, any of the other CM Policies, or Applicable Laws, we are entitled to recover
              the amount of the refund from you, including by subtracting the amount of the refund
              from any future Payouts due to you.
            </p>
          </Clause>
          <Clause number="8.13">
            <p>
              If we are unable to collect any amounts you owe under these Terms or any of the other
              CM Policies, we may engage in collection efforts to recover such amounts from you.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="cancellations" number={9} title="Cancellations and Refunds">
          <Clause number="9.1">
            <p>All cancellations must be processed through the CM Platform.</p>
          </Clause>
          <Clause number="9.2">
            <p>
              You may cancel a confirmed Booking by notifying us through the CM Platform as soon as
              reasonably practicable. Where you cancel a Booking:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                The Customer shall be entitled to a full refund of the Total Price, which Chef Mate
                shall process from funds held.
              </li>
              <li>
                Chef Mate may charge you a reasonable processing fee in respect of the cancellation.
              </li>
              <li>
                Repeated cancellations may result in reduced visibility on the CM Platform,
                suspension, or termination of your access in accordance with the suspension and
                termination provisions in clause 17 of these Terms.
              </li>
            </ul>
          </Clause>
          <Clause number="9.3">
            <p>
              Notwithstanding the above, where Chef Mate is able to arrange a Substitute Chef to
              fulfil the Booking, no processing fee shall be charged to you in respect of that
              cancellation.
            </p>
          </Clause>
          <Clause number="9.4">
            <p>
              A Customer may cancel a Booking in accordance with the{" "}
              <Link className="underline" href="/legal/customer-terms">
                Terms and Conditions for Customers
              </Link>
              . Where a Customer cancels a Booking:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>The Customer shall be entitled to a full refund of the Total Price.</li>
              <li>
                You shall be entitled to reimbursement of any reasonable and verifiable expenses
                that you have already incurred in preparation for the Booking, including the cost of
                ingredients purchased or transport costs incurred, if any, provided that you submit
                satisfactory proof of such expenses to Chef Mate within 5 Business Days of the
                cancellation.
              </li>
              <li>
                Chef Mate shall deduct any verified expenses payable to you from the refund due to
                the Customer, and shall remit the balance of the refund to the Customer.
              </li>
            </ul>
          </Clause>
          <Clause number="9.5">
            <p>
              For the avoidance of doubt, you are not entitled to the Chef Fee or any portion
              thereof in respect of a Booking cancelled by the Customer, other than the
              reimbursement of verified expenses described above.
            </p>
          </Clause>
          <Clause number="9.6">
            <p>
              Where you are designated as a Primary Chef under a Subscription Package and you are
              unable to fulfil a particular Booking within that Subscription Package due to illness,
              emergency, or similar circumstances beyond your reasonable control, you must notify us
              as soon as reasonably practicable. In such circumstances, Chef Mate may arrange a
              Substitute Chef for that Booking only, in consultation with the Customer. You will not
              receive a Payout in respect of any Booking fulfilled by a Substitute Chef, but no
              processing fee or penalty shall be charged to you. Repeated inability to fulfil
              Bookings under a Subscription Package may result in the Customer being offered the
              option to select a new Primary Chef.
            </p>
          </Clause>
          <Clause number="9.7">
            <p>
              Refunds to Customers are processed by Chef Mate in accordance with these Terms and the
              Terms and Conditions for Customers. Where a refund is due to a Customer as a result of
              your cancellation or failure to fulfil a Booking, Chef Mate is entitled to recover the
              amount of the refund from you, including by deducting it from any current or future
              Payouts, in accordance with the payment provisions set out in clause 8 of these Terms.
            </p>
          </Clause>
          <Clause number="9.8">
            <p>
              Chef Mate may cancel a Booking on behalf of either Party in exceptional circumstances,
              including where: (1) a Force Majeure event prevents fulfilment; (2) there is a
              credible safety concern; (3) cancellation is required for compliance with Applicable
              Laws; or (4) there has been a material misrepresentation by either Party. In such
              circumstances, Chef Mate will determine the appropriate refund and Payout allocation,
              having regard to the circumstances and acting reasonably and in accordance with
              Applicable Laws.
            </p>
          </Clause>
          <Clause number="9.9">
            <p>Nothing in this clause limits the rights of Chefs or Customers under the CPA.</p>
          </Clause>
        </TermsSection>

        <TermsSection id="professional-standards" number={10} title="Professional Standards">
          <Clause number="10.1">
            <p>
              In order to maintain the reputation of the CM Platform as a trusted marketplace, you
              are expected to perform the Services with the degree of professionalism, skill, and
              care reasonably expected of a competent culinary professional, having regard to the
              nature of the Booking and the reasonable expectations of the Customer.
            </p>
          </Clause>
          <Clause number="10.2">
            <p>
              You must personally perform the Services. You may not delegate, subcontract, or
              appoint any other person to perform the Services on your behalf without our prior
              written consent. If you are unable to personally fulfil a confirmed Booking for any
              reason, including illness or emergency, you must notify us immediately so that we may,
              in consultation with the Customer, arrange a substitute Chef. Failure to personally
              perform the Services or to notify us timeously may result in the withholding of a
              Payout and further action in accordance with the suspension and termination provisions
              of these Terms.
            </p>
          </Clause>
          <Clause number="10.3">
            <p>
              It is your responsibility to ensure compliance with all food safety and hygiene
              requirements under Applicable Laws, including but not limited to the Foodstuffs Act
              and the Hygiene Regulations.
            </p>
          </Clause>
          <Clause number="10.4">
            <p>
              You must comply with any dietary restrictions and allergies stipulated by the Customer
              at the time of requesting the Booking. If you are unable to accommodate the dietary
              restrictions and allergies stipulated by the Customer, you must inform the Customer
              and decline the Booking request. Failure to comply with dietary requirements and
              allergies in performance of the Services is considered a material breach of these
              Terms, and may result in your immediate suspension from the CM Platform, in accordance
              with the suspension and termination provisions set out in clause 17 of these Terms.
            </p>
          </Clause>
          <Clause number="10.5">
            <p>
              You must treat the Customer Premises with respect. You may be held responsible by the
              Customer for any damage to the Customer Premises caused by your actions during your
              performance of the Services.
            </p>
          </Clause>
          <Clause number="10.6">
            <p>
              You may not engage in any offensive or illegal behaviour during the fulfilment of a
              Booking. Any behaviour that is unsafe, discriminatory, or violates the Customer&apos;s
              privacy or property may result in your immediate suspension from the CM Platform, in
              accordance with the suspension and termination provisions set out in clause 17 of
              these Terms.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="ratings" number={11} title="Ratings and Review">
          <Clause number="11.1">
            <p>
              The CM Platform operates a mutual review system. Following the fulfilment of a
              Booking, both you and the Customer may submit ratings and written reviews of each
              other through the CM Platform in accordance with the{" "}
              <Link className="underline" href="/legal/review-and-ratings">
                Review and Ratings Policy
              </Link>
              .
            </p>
          </Clause>
          <Clause number="11.2">
            <p>
              You acknowledge that you have read and agree to be bound by the Review and Ratings
              Policy, which governs, among other things, the submission, moderation, and removal of
              reviews, prohibited conduct in connection with reviews, and the consequences of
              sustained poor ratings.
            </p>
          </Clause>
          <Clause number="11.3">
            <p>
              We reserve the right to moderate, edit, or remove reviews in accordance with the
              Review and Ratings Policy. Sustained poor ratings may result in reduced visibility on
              the CM Platform, or suspension or termination of your access in accordance with the
              suspension and termination provisions set out in clause 17 of these Terms.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="data-protection" number={12} title="Data Protection">
          <Clause number="12.1">
            <p>
              In the course of using the CM Platform and fulfilling Bookings, you may have access to
              Personal Information of Customers, including their names, addresses, contact details,
              dietary requirements, and health-related information such as allergies. You
              acknowledge that you are bound by POPIA and any other Applicable Laws relating to the
              protection of Personal Information, and you must process all Customer Personal
              Information in accordance with POPIA and the{" "}
              <Link className="underline" href="/legal/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </Clause>
          <Clause number="12.2">
            <p>
              You may only use Customer Personal Information for the purpose of accepting and
              fulfilling the relevant Booking and for no other purpose. You may not retain, copy,
              share, sell, or otherwise process Customer Personal Information beyond what is
              strictly necessary for the acceptance and fulfilment of the Booking, unless required
              by Applicable Laws.
            </p>
          </Clause>
          <Clause number="12.3">
            <p>
              You must implement and maintain reasonable technical and organisational measures to
              protect Customer Personal Information against unauthorised access, loss, destruction,
              or damage. If you become aware of any actual or suspected data breach involving
              Customer Personal Information, you must notify Chef Mate immediately and cooperate
              fully with any investigation or remedial action.
            </p>
          </Clause>
          <Clause number="12.4">
            <p>
              You must cooperate with Chef Mate in responding to any request from a data subject
              exercising their rights under POPIA, including requests for access to, correction of,
              or deletion of Personal Information. Upon termination of these Terms, you must
              immediately delete or return all Customer Personal Information in your possession,
              unless retention is required by Applicable Laws.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="insurance" number={13} title="Insurance">
          <Clause number="13.1">
            <p>
              You are solely responsible for obtaining and maintaining adequate insurance coverage
              in respect of your performance of the Services, in amounts sufficient to cover any
              reasonably foreseeable claims arising from your provision of the Services.
            </p>
          </Clause>
          <Clause number="13.2">
            <p>
              Chef Mate does not provide insurance coverage to Chefs and accepts no responsibility
              for any loss, damage, or claim arising from your failure to maintain adequate
              insurance. We may, from time to time, require you to provide proof of insurance as a
              condition of continued access to the CM Platform.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="liability" number={14} title="Limitation of Liability">
          <Clause number="14.1">
            <p>
              The CM Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
              basis. In other words, Chef Mate does not warrant or represent that: (1) the CM
              Platform will be uninterrupted, secure, or error-free; (2) any particular number or
              frequency of Bookings will be available to you; (3) Customers will fulfil their
              obligations to you; or (4) the CM Platform will otherwise meet your specific
              requirements or expectations.
            </p>
          </Clause>
          <Clause number="14.2">
            <p>
              Chef Mate shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages, including but not limited to loss of profits, loss of revenue, loss
              of business, loss of opportunity, or loss of data, howsoever arising.
            </p>
          </Clause>
          <Clause number="14.3">
            <p>
              Nothing in these Terms shall exclude or limit liability that cannot be excluded or
              limited under Applicable Laws, including the CPA.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="indemnities" number={15} title="Indemnities">
          <Clause number="15.1">
            <p>
              You indemnify and hold harmless Chef Mate, its directors, officers, employees, agents,
              and affiliates from and against any and all claims, demands, losses, damages,
              liabilities, costs, and expenses (including reasonable legal costs on the scale as
              between attorney and own client) arising out of or in connection with:
            </p>
            <ol className={alphaListClass}>
              <li>your performance or failure to perform the Services;</li>
              <li>any breach by you of these Terms or any CM Policies;</li>
              <li>any breach by you of Applicable Laws, including food safety and hygiene laws;</li>
              <li>
                any claim by a Customer or third party arising from your acts or omissions in
                connection with a Booking, including claims relating to personal injury, illness,
                property damage, allergic reactions, or food contamination;
              </li>
              <li>
                any claim arising from your misrepresentation of qualifications, experience, or
                certifications;
              </li>
              <li>
                any infringement of intellectual property rights by content uploaded by you to the
                CM Platform; and
              </li>
              <li>
                any tax, penalty, or interest imposed on Chef Mate as a result of your failure to
                comply with your tax obligations.
              </li>
            </ol>
          </Clause>
          <Clause number="15.2">
            <p>
              This indemnity shall survive the termination of these Terms for any reason and shall
              apply regardless of whether Chef Mate was negligent or contributed to the relevant
              loss, to the fullest extent permitted by Applicable Laws.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="non-circumvention" number={16} title="Non-Circumvention">
          <Clause number="16.1">
            <p>
              You acknowledge that the CM Platform serves as the introduction mechanism between you
              and Customers, and that Chef Mate invests significant resources in acquiring
              Customers, building the marketplace, and maintaining platform infrastructure. You
              agree that, during the term of these Terms and for the Restricted Period thereafter,
              you will not, directly or indirectly:
            </p>
            <ol className={alphaListClass}>
              <li>
                solicit, canvas, or approach any Customer for the provision of personal chef
                services, meal preparation services, or any services substantially similar to the
                Services outside of the CM Platform;
              </li>
              <li>
                accept any engagement from a Customer for such services outside of the CM Platform;
              </li>
              <li>
                encourage, induce, or facilitate any Customer to book services outside of the CM
                Platform;
              </li>
              <li>
                provide your personal contact details to a Customer for the purpose of arranging
                services outside of the CM Platform; or
              </li>
              <li>
                assist any third party in circumventing the CM Platform in respect of any Customer.
              </li>
            </ol>
          </Clause>
          <Clause number="16.2">
            <p>
              For the avoidance of doubt, a &ldquo;Customer&rdquo; for the purposes of this clause
              means any person who was registered as a Customer on the CM Platform at any time
              during the period in which you were registered as a Chef on the CM Platform, whether
              or not you provided Services to that Customer. If you breach this clause, you shall be
              liable to pay Chef Mate, as a reasonable pre-estimate of damages and not as a penalty,
              an amount equal to the Commission that would have been payable to Chef Mate had the
              relevant Booking been processed through the CM Platform, without prejudice to any
              other rights or remedies available to Chef Mate under these Terms or at law.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="suspension" number={17} title="Suspension and Termination">
          <Clause number="17.1">
            <p>
              We may suspend your access to the CM Platform, with or without notice, if we
              reasonably believe that:
            </p>
            <ol className={alphaListClass}>
              <li>you have committed a material breach of these Terms or any CM Policies;</li>
              <li>
                you have engaged in conduct that is unsafe, dishonest, discriminatory, or otherwise
                harmful to Customers, other Chefs, or the reputation of the CM Platform;
              </li>
              <li>
                you have failed to maintain the eligibility criteria set out in clause 5.2 of these
                Terms;
              </li>
              <li>
                you have received sustained poor ratings or multiple complaints from Customers;
              </li>
              <li>
                you have failed to comply with Applicable Laws, including food safety and hygiene
                laws;
              </li>
              <li>you are the subject of a complaint, investigation, or legal proceeding;</li>
              <li>
                your continued access to the CM Platform poses a risk to the safety of Customers or
                the integrity of the CM Platform; or
              </li>
              <li>
                suspension is required for compliance with Applicable Laws or the direction of any
                Authority.
              </li>
            </ol>
          </Clause>
          <Clause number="17.2">
            <p>
              During any period of suspension, you will not be able to accept new Bookings or access
              certain features of the CM Platform. We will use reasonable efforts to notify you of
              the reason for the suspension and provide you with an opportunity to respond, unless
              immediate suspension is required in the interests of safety or legal compliance.
            </p>
          </Clause>
          <Clause number="17.3">
            <p>
              We may terminate these Terms with immediate effect, without notice, if any of the
              grounds for suspension set out above apply and we reasonably determine that the breach
              or conduct is not capable of remedy, or has not been remedied within a reasonable
              period following notice. In all other circumstances, we may terminate these Terms on
              10 Business Days&apos; written notice to you.
            </p>
          </Clause>
          <Clause number="17.4">
            <p>
              You may terminate these Terms at any time by deactivating your CM Account, provided
              that you remain bound by any outstanding obligations in respect of confirmed Bookings,
              Payouts, refunds, the non-circumvention and data protection provisions of these Terms,
              and any other provisions of these Terms or the CM Policies which are contemplated to
              survive termination.
            </p>
          </Clause>
          <Clause number="17.5">
            <p>Upon termination:</p>
            <ol className={alphaListClass}>
              <li>your access to the CM Platform will be revoked;</li>
              <li>
                any pending Bookings will be cancelled and managed in accordance with the
                cancellation provisions in clause 9 of these Terms;
              </li>
              <li>
                any outstanding Payouts will be processed in accordance with these Terms, subject to
                any applicable deductions; and
              </li>
              <li>
                the provisions of these Terms that are expressed or intended to survive termination
                shall continue in full force and effect, including the indemnity, data protection,
                non-circumvention, limitation of liability, and dispute resolution provisions.
              </li>
            </ol>
          </Clause>
        </TermsSection>

        <TermsSection id="complaints" number={18} title="Complaints Handling">
          <Clause number="18.1">
            <p>
              Chef Mate administers a complaints-handling process in respect of certain disputes and
              complaints arising between Chefs and Customers. You acknowledge that you have read and
              agree to be bound by the{" "}
              <Link className="underline" href="/legal/complaints-handling">
                Complaints Handling Process
              </Link>
              , which is published separately and forms part of the CM Policies. You agree to
              cooperate fully with any complaint or investigation initiated by us or by a Customer,
              including by providing information and documentation as reasonably requested.
            </p>
          </Clause>
          <Clause number="18.2">
            <p>
              Chef Mate&apos;s role in handling complaints is limited to facilitating resolution
              between you and the Customer. Chef Mate is not an arbitrator or adjudicator and does
              not assume liability for the outcome of any complaint. However, we reserve the right
              to make final determinations in respect of refunds, Payout adjustments, and platform
              access in accordance with these Terms and the CM Policies. If a complaint cannot be
              resolved through the Complaints Handling Process, either you or the Customer may
              pursue the dispute using any alternative mechanisms available to you under the
              Applicable Laws.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="taxes" number={19} title="Taxes">
          <Clause number="19.1">
            <p>
              You are solely responsible for your own tax affairs, including the registration,
              filing, and payment of all taxes arising from your use of the CM Platform and receipt
              of Payouts. Chef Mate is not responsible for determining your tax obligations or for
              withholding or remitting any taxes on your behalf, unless expressly required to do so
              by Applicable Laws.
            </p>
          </Clause>
          <Clause number="19.2">
            <p>
              If you are, or become, registered as a VAT vendor under the VAT Act, you must notify
              us immediately and provide us with your VAT registration number. You acknowledge that:
              (1) where you are a registered VAT vendor, your Chef Fee constitutes consideration for
              a taxable supply and you are responsible for accounting for and paying VAT to the
              South African Revenue Service; (2) Chef Mate will not be liable for any VAT that you
              fail to account for; and (3) you must issue such tax invoices as are required under
              the VAT Act.
            </p>
          </Clause>
          <Clause number="19.3">
            <p>
              If you are not registered as a VAT vendor, you warrant that your turnover does not
              exceed the threshold for compulsory registration under the VAT Act, and you undertake
              to notify us immediately should your turnover exceed that threshold.
            </p>
          </Clause>
          <Clause number="19.4">
            <p>
              You indemnify Chef Mate against any tax, penalty, interest, or other liability imposed
              on Chef Mate by any Authority as a result of your failure to comply with your tax
              obligations.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="general" number={20} title="General">
          <Clause number="20.1">
            <p>
              <strong>Intellectual Property:</strong> All intellectual property rights in and to the
              CM Platform, including but not limited to the software, design, trademarks, logos,
              trade names, content, and documentation, are and shall remain the exclusive property
              of Chef Mate. Nothing in these Terms grants you any right, title, or interest in Chef
              Mate&apos;s intellectual property. You grant Chef Mate a non-exclusive, royalty-free,
              worldwide licence to use, reproduce, and display any content you upload to the CM
              Platform (including photographs, descriptions, and menu information) for the purpose
              of operating and promoting the CM Platform. You retain ownership of your own original
              content, but acknowledge that reviews, ratings, and feedback submitted through the CM
              Platform may be used by Chef Mate in accordance with the CM Policies.
            </p>
          </Clause>
          <Clause number="20.2">
            <p>
              <strong>Force Majeure:</strong> Neither Party shall be liable for any failure or delay
              in performing its obligations under these Terms to the extent that such failure or
              delay is caused by a Force Majeure event. The affected Party must notify the other
              Party as soon as reasonably practicable after becoming aware of the Force Majeure
              event and must use reasonable efforts to mitigate its effects. If a Force Majeure
              event continues for a period exceeding 30 Business Days, either Party may terminate
              these Terms by giving written notice to the other Party.
            </p>
          </Clause>
          <Clause number="20.3">
            <p>
              <strong>Dispute Resolution:</strong> In the event of any dispute arising out of or in
              connection with these Terms, the Parties will attempt to resolve the dispute in good
              faith for a period of not less than 30 Business Days. If the dispute is not resolved
              within that period, either Party may refer the dispute to mediation administered by
              the Arbitration Foundation of Southern Africa in accordance with its mediation rules.
              If mediation fails to resolve the dispute within 14 Business Days of referral, either
              Party may institute legal proceedings in the appropriate court of competent
              jurisdiction.
            </p>
          </Clause>
          <Clause number="20.4">
            <p>
              <strong>Governing Law and Jurisdiction:</strong> These Terms shall be governed by and
              construed in accordance with the laws of the Republic of South Africa. The Parties
              consent to the non-exclusive jurisdiction of the High Court of South Africa, Gauteng
              Division, Johannesburg, in respect of any dispute arising from these Terms.
            </p>
          </Clause>
          <Clause number="20.5">
            <p>
              <strong>Contact:</strong> All notices under these Terms must be in writing and
              delivered to the relevant Party&apos;s registered email address on file. Notices sent
              by email shall be deemed received on the business day following the date of
              transmission. Chef Mate may be contacted at{" "}
              <a className="underline" href="mailto:support@chefmate.co.za">
                support@chefmate.co.za
              </a>
              .
            </p>
          </Clause>
          <Clause number="20.6">
            <p>
              <strong>Whole agreement:</strong> These Terms, together with the other CM Policies,
              constitute the entire agreement between you and Chef Mate in respect of your use of
              the CM Platform as a Chef, and supersede all prior negotiations, representations,
              warranties, and understandings between the Parties in respect of the subject matter
              hereof.
            </p>
          </Clause>
          <Clause number="20.7">
            <p>
              <strong>Survival:</strong> The provisions of these Terms that are expressly or by
              implication intended to survive termination shall survive, including without
              limitation the indemnity, data protection, non-circumvention, intellectual property,
              limitation of liability, tax, and dispute resolution provisions.
            </p>
          </Clause>
          <Clause number="20.8">
            <p>
              <strong>Waiver:</strong> No failure or delay by either Party in exercising any right
              under these Terms shall constitute a waiver of that right, nor shall any single or
              partial exercise of any right preclude any other or further exercise of that right or
              the exercise of any other right.
            </p>
          </Clause>
          <Clause number="20.9">
            <p>
              <strong>Severability:</strong> If any provision of these Terms is found to be invalid,
              unlawful, or unenforceable by a court of competent jurisdiction, that provision shall
              be severed from these Terms and the remaining provisions shall continue in full force
              and effect. The Parties agree to negotiate in good faith a replacement provision that
              achieves, as closely as possible, the commercial intention of the severed provision.
            </p>
          </Clause>
          <Clause number="20.10">
            <p>
              <strong>Cession and Assignment:</strong> You may not cede, assign, or transfer any of
              your rights or obligations under these Terms without our prior written consent. Chef
              Mate may cede, assign, or transfer its rights and obligations under these Terms to any
              affiliate or successor entity without your consent, provided that such assignment does
              not materially diminish your rights under these Terms.
            </p>
          </Clause>
          <Clause number="20.11">
            <p>
              <strong>Amendment:</strong> Chef Mate may amend these Terms from time to time. We will
              notify you of material changes by publishing updated Terms on the CM Platform and by
              sending a notification to your registered email address. Your continued use of the CM
              Platform following notification of a change shall constitute your acceptance of the
              amended Terms. If you do not agree with any amendment, your remedy is to discontinue
              use of the CM Platform and to deactivate your CM Account.
            </p>
          </Clause>
        </TermsSection>
      </div>

      <footer className="mt-12 border-t border-[var(--color-oxblood)]/10 pt-6 text-sm text-[var(--color-charcoal)]/55">
        <p>
          <strong>Version:</strong> {TERMS_VERSION} · <strong>Effective:</strong> 18 August 2026
        </p>
        <a
          className="mt-4 inline-block font-bold text-[var(--color-oxblood)] underline"
          href="#top"
        >
          Back to top
        </a>
      </footer>
    </article>
  );
}
