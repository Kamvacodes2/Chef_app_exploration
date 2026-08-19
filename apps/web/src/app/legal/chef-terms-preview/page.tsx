import type { ReactNode } from "react";
import Link from "next/link";

const DRAFT_VERSION = "2026-08-18";

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

function Definition({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--color-oxblood)]/8 pb-3 last:border-0">
      <dt className="font-bold text-[var(--color-charcoal)]">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DraftNote({ children }: { readonly children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <strong>Draft review note:</strong> {children}
    </aside>
  );
}

const alphaListClass = "list-[lower-alpha] space-y-2 pl-6";

export default function ChefTermsPreviewPage() {
  return (
    <article
      id="top"
      className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)] sm:p-10"
    >
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>

      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">
          Draft preview — not in force
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          Terms and Conditions for Chefs
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-amber-950">
          Version under review: {DRAFT_VERSION}. This staging document is provided for product and
          legal review only. It does not replace the current Chef Service Provider Agreement, and no
          acceptance of this draft is being collected.
        </p>
      </div>

      <section className="mt-8 rounded-2xl bg-[var(--color-charcoal)]/[0.04] p-5">
        <h2 className="font-black text-[var(--color-charcoal)]">Activation blockers</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-charcoal)]/70">
          These items must be resolved before this draft can become a binding policy:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-charcoal)]/70">
          <li>
            The platform currently uses a 15-minute chef-offer window. That verified value is used
            in this draft instead of the unresolved hours placeholder.
          </li>
          <li>
            The verified booking split is 65% to the chef and 35% to ChefMate. The 35% Commission is
            used below, but legal and commercial approval is still required.
          </li>
          <li>
            Weekly payout language reflects existing customer-facing copy, but payouts are currently
            recorded by an administrator and no automated weekly settlement job exists.
          </li>
          <li>
            Subscription Packages, Primary Chefs, and Substitute Chefs are not operational. The
            clauses remain in this preview as intended future policy and must not be activated
            first.
          </li>
          <li>
            Customer refund bands, chef expense reimbursement, and cancellation processing are not
            implemented and must be reconciled with the current Customer Terms.
          </li>
          <li>
            Qualification, food-safety certification, criminal-record, insurance, and ongoing
            re-verification requirements are not yet enforced by the application workflow.
          </li>
          <li>
            Standalone Platform Rules, Complaints Handling Process, and Review and Ratings Policy
            documents are referenced but are not all published as separate legal pages yet.
          </li>
          <li>
            Versioned policy acceptance is currently mutable and caller-supplied. Immutable
            acceptance history, audience rules, server-owned versions, and enforcement are required
            before launch.
          </li>
        </ul>
      </section>

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
                South Africa under registration number 2026/593342/07 (Chef Mate, we, us, or our);
                and
              </li>
              <li>
                any natural person who uses Chef Mate&apos;s website, application, or other
                platforms to independently offer personal chef services to the public (Chef, you, or
                your),
              </li>
            </ol>
            <p>each a Party and collectively the Parties.</p>
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
              parties for certain losses, liabilities, or damages. We may also have claims against
              you and hold you responsible to repay us further amounts, including costs or damages
              that we may otherwise have to pay.
            </p>
          </Clause>
          <Clause number="2.3">
            <p>
              To the extent that the relationship between you and Chef Mate is governed by
              Applicable Laws, including the CPA, no provision of these Terms is intended to breach
              those laws. All provisions must therefore be treated as limited to the extent
              necessary to comply with Applicable Laws.
            </p>
          </Clause>
          <Clause number="2.4">
            <p>
              These Terms must be read together with the other documents governing the CM Platform:
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
                <Link className="underline" href="/legal/code-of-conduct">
                  Chef Code of Conduct
                </Link>
                ;
              </li>
              <li>Platform Rules;</li>
              <li>Complaints Handling Process; and</li>
              <li>Review and Ratings Policy,</li>
            </ul>
            <p>collectively, the CM Policies.</p>
          </Clause>
          <Clause number="2.5">
            <p>
              The CM Policies, to the extent applicable, collectively constitute the contract
              regulating the relationship between you and Chef Mate.
            </p>
          </Clause>
          <Clause number="2.6">
            <p>
              By accessing, using, registering on, or continuing to use the CM Platform, you
              acknowledge that you have read and understood all applicable CM Policies, including
              these Terms, and voluntarily agree to be bound by them.
            </p>
          </Clause>
          <Clause number="2.7">
            <p>
              To the extent of any inconsistency between these Terms and Applicable Laws, the
              Applicable Laws prevail.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="definitions" number={3} title="Definitions and Interpretation">
          <Clause number="3.1">
            <p>
              In these Terms, the following words and phrases have the meanings assigned to them
              unless the context requires otherwise:
            </p>
            <dl className="mt-4 space-y-3">
              <Definition term="Applicable Fees">
                any fees, charges, or costs payable by you under these Terms or any CM Policies,
                including the Commission, transaction fees, and administrative charges, as
                determined and published by us from time to time;
              </Definition>
              <Definition term="Applicable Laws">
                any national legislation, statutes, ordinances, laws, regulations, by-laws, common
                law, binding judgments, directives, codes, orders, or other requirements of a
                legally constituted public authority in force at any time in South Africa;
              </Definition>
              <Definition term="Authority">
                any government, regulatory, or statutory body or authority, whether national,
                provincial, or local, having jurisdiction over the subject matter of these Terms;
              </Definition>
              <Definition term="Booking">
                a confirmed engagement between a Chef and a Customer for Services at a specified
                date, time, and location, whether once-off or a session forming part of a
                Subscription Package;
              </Definition>
              <Definition term="Business Day">
                any day other than a Saturday, Sunday, or official public holiday in South Africa;
              </Definition>
              <Definition term="Cancellation Fee">
                the fee charged to you when you cancel a Booking, as set out in clause 9;
              </Definition>
              <Definition term="Chef Fee">
                the portion of the Total Price payable to the Chef after deducting the Commission
                and any other Applicable Fees;
              </Definition>
              <Definition term="CM Account">
                the registered account created by you to offer and manage the Services;
              </Definition>
              <Definition term="CM Platform">
                the website at{" "}
                <a className="underline" href="https://chefmate.co.za">
                  chefmate.co.za
                </a>
                , application, or any other platform offered and operated by Chef Mate that enables
                Chefs to offer Services;
              </Definition>
              <Definition term="CM Policies">
                these Terms, the Terms and Conditions for Customers, Privacy Policy, Platform Rules,
                Complaints Handling Process, Review and Ratings Policy, and other standards, codes,
                and rules governing your use of the CM Platform or relationship with us, as amended
                from time to time;
              </Definition>
              <Definition term="Commission">
                the percentage of the Total Price payable to Chef Mate for each Fulfilled Booking,
                currently 35% of the Total Price, as determined and published by us from time to
                time;
              </Definition>
              <Definition term="CPA">
                the Consumer Protection Act 68 of 2008 and its regulations;
              </Definition>
              <Definition term="Customer">
                a natural person registered on the CM Platform who engages, or seeks to engage, a
                Chef for Services;
              </Definition>
              <Definition term="Customer Personal Information">
                Personal Information relating to Customers;
              </Definition>
              <Definition term="Customer Premises">
                the location specified for performance of the Services, including facilities,
                equipment, utensils, and other property made available to the Chef there;
              </Definition>
              <Definition term="Foodstuffs Act">
                the Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972 and its regulations;
              </Definition>
              <Definition term="Force Majeure">
                an event or circumstance beyond a Party&apos;s reasonable control, including natural
                disasters, epidemics, pandemics, civil unrest, war, terrorism, government action,
                power failures, internet or telecommunications failures, or another event that could
                not reasonably have been foreseen or prevented;
              </Definition>
              <Definition term="Fulfilled Booking">
                a Booking for which the Chef completed the Services in accordance with these Terms;
              </Definition>
              <Definition term="Hygiene Regulations">
                the Regulations Governing General Hygiene Requirements for Food Premises, the
                Transport of Food and Related Matters, 2018, published under the Foodstuffs Act;
              </Definition>
              <Definition term="Payout">
                payment of the Chef Fee to you following a Fulfilled Booking, less deductions
                authorised under these Terms;
              </Definition>
              <Definition term="Personal Information">the meaning given in POPIA;</Definition>
              <Definition term="Platform Rules">
                rules governing conduct on the CM Platform, published and amended by Chef Mate from
                time to time;
              </Definition>
              <Definition term="POPIA">
                the Protection of Personal Information Act 4 of 2013 and its regulations;
              </Definition>
              <Definition term="Primary Chef">
                the Chef selected by a Customer for a Subscription Package and expected to fulfil
                its Bookings unless a substitute is arranged under these Terms;
              </Definition>
              <Definition term="Privacy Policy">
                Chef Mate&apos;s privacy policy, as amended from time to time, available at{" "}
                <Link className="underline" href="/legal/privacy">
                  /legal/privacy
                </Link>
                ;
              </Definition>
              <Definition term="Restricted Period">
                12 months from the date on which you last provided Services to a Customer through
                the CM Platform;
              </Definition>
              <Definition term="Services">
                personal chef services offered through the CM Platform, including meal planning,
                meal preparation, cooking, and related services described in the relevant Booking;
              </Definition>
              <Definition term="Subscription Package">
                a package providing a Customer with access to multiple Bookings over a specified
                period, linked to a Primary Chef selected by the Customer;
              </Definition>
              <Definition term="Substitute Chef">
                a Chef arranged by Chef Mate to fulfil a Booking in place of the originally assigned
                Chef or Primary Chef under clause 9;
              </Definition>
              <Definition term="Total Price">
                the total amount payable by a Customer for a Booking, inclusive of VAT where
                applicable, as determined and published by Chef Mate;
              </Definition>
              <Definition term="VAT">value-added tax levied under the VAT Act;</Definition>
              <Definition term="VAT Act">
                the Value-Added Tax Act 89 of 1991 and its regulations.
              </Definition>
            </dl>
          </Clause>
          <DraftNote>
            Ingredient sourcing has been removed from the Services definition as instructed.
            Subscription-related definitions remain future-state and cannot be activated until the
            underlying service exists.
          </DraftNote>
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
              with Customers and are entirely responsible for the quality, legality, and execution
              of the Services.
            </p>
          </Clause>
          <Clause number="4.3">
            <p>
              Chef Mate is not a party to the contract between Chefs and Customers for Services.
              Chef Mate operates and administers the CM Platform, including facilitating
              introductions, managing Bookings, establishing and administering pricing, processing
              payments, providing communication tools, and administering complaints. Pricing
              administration is a marketplace-governance function and does not constitute
              operational control over or supervision of how you perform the Services.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="platform-access" number={5} title="Platform Access">
          <Clause number="5.1">
            <p>
              Access to the CM Platform is subject to the initial application and ongoing
              verification process administered by us.
            </p>
          </Clause>
          <Clause number="5.2">
            <p>To access the CM Platform, you must:</p>
            <ol className={alphaListClass}>
              <li>be at least 18 years old;</li>
              <li>
                hold a culinary qualification from a registered institution or possess sufficient
                verifiable cooking experience, as determined by us;
              </li>
              <li>
                be adequately trained in food-safety and hygiene principles and Applicable Laws by a
                facility or institution accredited by the Quality Council for Trades and
                Occupations, and keep that training current; and
              </li>
              <li>undergo a criminal-record check.</li>
            </ol>
          </Clause>
          <Clause number="5.3">
            <p>
              We may conduct ongoing audits to ensure that Chefs continue to meet the eligibility
              criteria, including re-verifying qualifications, certifications, or criminal-record
              checks.
            </p>
          </Clause>
          <Clause number="5.4">
            <p>
              You must cooperate fully with the initial and ongoing verification process, including:
            </p>
            <ol className={alphaListClass}>
              <li>
                accurately and completely disclosing requested identity, contact, address,
                background, criminal-history, professional-conduct, licence, certification, and
                qualification information and documents;
              </li>
              <li>keeping the contact details in your CM Account current; and</li>
              <li>
                promptly notifying us of material changes affecting your eligibility or compliance.
              </li>
            </ol>
          </Clause>
          <Clause number="5.5">
            <p>
              Personal Information processed during application and verification is governed by our{" "}
              <Link className="underline" href="/legal/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </Clause>
          <Clause number="5.6">
            <p>
              Meeting the eligibility criteria does not create an unconditional right to access the
              CM Platform. We may approve, reject, restrict, suspend, or terminate access for any
              lawful reason, including:
            </p>
            <ol className={alphaListClass}>
              <li>
                failure to maintain current food-safety, hygiene, qualification, identity,
                insurance, or other required documents;
              </li>
              <li>false, incomplete, fraudulent, or misleading information;</li>
              <li>unsafe, dishonest, discriminatory, illegal, or harmful conduct;</li>
              <li>failure to comply with Applicable Laws or a direction from an Authority;</li>
              <li>
                credible complaints, investigations, sustained poor ratings, or unresolved
                infractions;
              </li>
              <li>
                risk to a Customer, another Chef, the public, or the integrity and reputation of the
                CM Platform;
              </li>
              <li>lack of service availability or geographic demand; or</li>
              <li>any ground set out in clause 17.</li>
            </ol>
          </Clause>
          <DraftNote>
            The current application only records a self-declared food-safety certificate and does
            not enforce the other checks. Legal review must confirm whether the intended evidence is
            R638-related, a Certificate of Acceptability, or another accredited credential.
          </DraftNote>
        </TermsSection>

        <TermsSection id="booking-process" number={6} title="Booking Process">
          <Clause number="6.1">
            <p>
              When a Customer requests a Booking, you have 15 minutes from the issue of an offer to
              accept or decline it. An offer may cease to be available earlier if another eligible
              Chef accepts first.
            </p>
          </Clause>
          <Clause number="6.2">
            <p>
              You have complete discretion whether to accept or decline a Booking. We do not impose
              mandatory minimum Bookings, and you will not be penalised for declining before
              acceptance.
            </p>
          </Clause>
          <Clause number="6.3">
            <p>
              You may pause your profile at any time, during which you will not receive new Booking
              requests. We may deactivate or remove profiles inactive for a continuous period of
              three months after giving reasonable prior notice.
            </p>
          </Clause>
          <Clause number="6.4">
            <p>
              A Booking is confirmed when you accept the Booking and the Customer has made payment
              for it.
            </p>
          </Clause>
          <Clause number="6.5">
            <p>
              Once confirmed, you and the Customer are bound to the Booking. You must fulfil it or
              cancel under clause 9.
            </p>
          </Clause>
          <DraftNote>
            The 15-minute value matches the live offer TTL. Automatic three-month inactivity
            deactivation is not implemented.
          </DraftNote>
        </TermsSection>

        <TermsSection id="pricing-model" number={7} title="Pricing Model">
          <Clause number="7.1">
            <p>
              The CM Platform is a structured marketplace. To promote Customer confidence,
              transparency, consistency, and ease of booking, we determine pricing applicable to
              Services offered through it.
            </p>
          </Clause>
          <Clause number="7.2">
            <p>
              We determine and publish the Total Price applicable to a Booking from time to time.
            </p>
          </Clause>
          <Clause number="7.3">
            <p>
              The Total Price may vary based on Service duration, Booking location, complexity,
              Subscription Packages, promotions, seasonal demand, and other factors reasonably
              determined by Chef Mate.
            </p>
          </Clause>
          <Clause number="7.4">
            <p>
              We may offer Subscription Packages with multiple Bookings over a specified period at
              discounted rates. Different packages may carry different pricing structures, and the
              value of a Booking under a Subscription Package will differ from a once-off Booking.
            </p>
          </Clause>
          <Clause number="7.5">
            <p>
              By accepting a Booking, you agree to provide the Services for the Chef Fee displayed
              to you when the Booking is confirmed.
            </p>
          </Clause>
          <Clause number="7.6">
            <p>
              If you do not agree with the Chef Fee, you may decline the Booking or discontinue use
              of the CM Platform.
            </p>
          </Clause>
          <Clause number="7.7">
            <p>
              Nothing guarantees any minimum number of Bookings, revenue, or Payouts. Payouts
              depend, among other things, on the Bookings you accept and fulfil.
            </p>
          </Clause>
          <Clause number="7.8">
            <p>
              We may introduce, modify, withdraw, or administer promotions, discounts, Subscription
              Packages, loyalty benefits, referral incentives, pricing categories, dynamic pricing,
              and other marketplace mechanisms without prior consent, provided that the Chef Fee for
              a Booking is disclosed before you accept it.
            </p>
          </Clause>
          <Clause number="7.9">
            <p>
              Chef Mate&apos;s establishment of pricing does not create an employment relationship
              or alter your independent-service-provider status.
            </p>
          </Clause>
          <DraftNote>
            The platform currently shows chefs their exact Rand payout and applies a 65% chef share.
            Subscription and dynamic-pricing features are not active.
          </DraftNote>
        </TermsSection>

        <TermsSection id="payment" number={8} title="Payment">
          <Clause number="8.1">
            <p>
              You appoint Chef Mate as your payment-collection agent solely to accept and process
              Customer funds on your behalf.
            </p>
          </Clause>
          <Clause number="8.2">
            <p>
              Payment made by a Customer through the CM Platform is treated as payment directly to
              you, and you must provide the Services as though you received it directly.
            </p>
          </Clause>
          <Clause number="8.3">
            <p>
              Customer payments are processed through our payment gateway. We usually collect the
              Total Price when you accept the Booking unless otherwise stated.
            </p>
          </Clause>
          <Clause number="8.4">
            <p>We charge Commission for each Fulfilled Booking.</p>
          </Clause>
          <Clause number="8.5">
            <p>
              We may determine the Commission from time to time without prior consent, provided we
              take reasonable steps to notify you of changes.
            </p>
          </Clause>
          <Clause number="8.6">
            <p>Your Payout is the Total Price less the Commission and any other Applicable Fees.</p>
          </Clause>
          <Clause number="8.7">
            <p>
              Payouts are made weekly. We may temporarily suspend a Payout to prevent unlawful
              activity or fraud, investigate an alleged contravention, or comply with Applicable
              Laws.
            </p>
          </Clause>
          <Clause number="8.8">
            <p>
              To receive a Payout, you must provide accurate and current bank-account details and
              any additional information requested for legal or payment-provider compliance. A
              failure to do so may suspend a Payout until the information is supplied and validated.
            </p>
          </Clause>
          <Clause number="8.9">
            <p>
              Banking details and other Payout information are processed under our{" "}
              <Link className="underline" href="/legal/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </Clause>
          <Clause number="8.10">
            <p>
              You are responsible for ensuring that banking details are accurate, complete, and
              current. We are not responsible for loss resulting from incorrect, outdated, or
              incomplete information you provide.
            </p>
          </Clause>
          <Clause number="8.11">
            <p>
              Our obligation to effect a Payout is conditional on successful receipt of the Total
              Price from the Customer.
            </p>
          </Clause>
          <Clause number="8.12">
            <p>
              You authorise us to recover amounts due under the CM Policies by withholding them from
              future Payouts, including amounts already paid for a Booking later cancelled and
              refunds due to a Customer.
            </p>
          </Clause>
          <Clause number="8.13">
            <p>If we cannot collect amounts you owe, we may engage in collection efforts.</p>
          </Clause>
          <DraftNote>
            The current system creates pending chef earnings and relies on manual administrator
            settlement. A weekly settlement process must exist before clause 8.7 becomes binding.
          </DraftNote>
        </TermsSection>

        <TermsSection id="cancellations" number={9} title="Cancellations and Refunds">
          <Clause number="9.1">
            <p>All cancellations must be processed through the CM Platform.</p>
          </Clause>
          <Clause number="9.2">
            <p>
              You may cancel a confirmed Booking through the CM Platform as soon as reasonably
              practicable.
            </p>
          </Clause>
          <Clause number="9.3">
            <p>If you cancel:</p>
            <ol className={alphaListClass}>
              <li>
                the Customer is entitled to a full refund of the Total Price from funds held by Chef
                Mate;
              </li>
              <li>Chef Mate may charge you a reasonable processing fee;</li>
              <li>
                repeated cancellations may reduce your visibility or result in suspension or
                termination under clause 17; and
              </li>
              <li>no processing fee is charged if Chef Mate arranges a Substitute Chef.</li>
            </ol>
          </Clause>
          <Clause number="9.4">
            <p>
              A Customer may cancel under the Terms and Conditions for Customers. If a Customer
              cancels:
            </p>
            <ol className={alphaListClass}>
              <li>the Customer is entitled to a full refund of the Total Price;</li>
              <li>
                you are entitled to reasonable, verifiable preparation expenses already incurred,
                including ingredients or transport, if satisfactory proof is supplied within five
                Business Days;
              </li>
              <li>
                Chef Mate deducts verified expenses payable to you from the refund and remits the
                balance to the Customer; and
              </li>
              <li>
                you are not entitled to the Chef Fee or another portion of it beyond verified
                expenses.
              </li>
            </ol>
          </Clause>
          <Clause number="9.5">
            <p>
              If a Primary Chef cannot fulfil a Subscription Package Booking due to illness,
              emergency, or similar circumstances beyond reasonable control, they must notify us as
              soon as practicable. Chef Mate may, in consultation with the Customer, arrange a
              Substitute Chef for that Booking only. The Primary Chef receives no Payout for that
              Booking but incurs no processing fee or penalty. Repeated inability to fulfil such
              Bookings may result in the Customer being offered a new Primary Chef.
            </p>
          </Clause>
          <Clause number="9.6">
            <p>
              Refunds are processed under these Terms and the Customer Terms. If a refund results
              from your cancellation or failure to fulfil, we may recover it from current or future
              Payouts under clause 8.
            </p>
          </Clause>
          <Clause number="9.7">
            <p>
              Chef Mate may cancel for exceptional circumstances, including Force Majeure, credible
              safety concerns, legal compliance, or material misrepresentation. We will determine
              refund and Payout allocation reasonably and in accordance with Applicable Laws.
            </p>
          </Clause>
          <Clause number="9.8">
            <p>Nothing in this clause limits Chef or Customer rights under the CPA.</p>
          </Clause>
          <DraftNote>
            This proposed full-refund rule conflicts with the current Customer Terms, which state
            full refund more than 24 hours before, a 50% charge 6–24 hours before, and a 100% charge
            within six hours or for a no-show. No refund or expense-reimbursement engine currently
            exists.
          </DraftNote>
        </TermsSection>

        <TermsSection id="professional-standards" number={10} title="Professional Standards">
          <Clause number="10.1">
            <p>
              You must perform Services with the professionalism, skill, and care reasonably
              expected of a competent culinary professional, having regard to the Booking and
              reasonable Customer expectations.
            </p>
          </Clause>
          <Clause number="10.2">
            <p>
              You must perform Services personally and may not delegate, subcontract, or appoint
              another person without our prior written consent. If you cannot fulfil a confirmed
              Booking, notify us immediately so that we may, in consultation with the Customer,
              arrange a Substitute Chef. Failure to perform or notify us timeously may result in
              withheld Payout and action under clause 17.
            </p>
          </Clause>
          <Clause number="10.3">
            <p>
              You are responsible for compliance with food-safety and hygiene requirements under
              Applicable Laws, including the Foodstuffs Act and Hygiene Regulations.
            </p>
          </Clause>
          <Clause number="10.4">
            <p>
              You must comply with dietary restrictions and allergies provided by the Customer. If
              unable to do so, inform the Customer and decline the request. Failure to comply during
              performance is a material breach and may result in immediate suspension under clause
              17.
            </p>
          </Clause>
          <Clause number="10.5">
            <p>
              You must respect the Customer Premises and may be held responsible by the Customer for
              damage caused by your actions while providing Services.
            </p>
          </Clause>
          <Clause number="10.6">
            <p>
              You may not engage in offensive or illegal behaviour. Unsafe, discriminatory conduct
              or violations of Customer privacy or property may result in immediate suspension under
              clause 17.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="ratings" number={11} title="Ratings and Review">
          <Clause number="11.1">
            <p>
              The CM Platform operates a mutual-review system. After a Fulfilled Booking, you and
              the Customer may submit ratings and written reviews under the Review and Ratings
              Policy.
            </p>
          </Clause>
          <Clause number="11.2">
            <p>
              You acknowledge that the Review and Ratings Policy governs submission, moderation,
              removal, prohibited conduct, and the consequences of sustained poor ratings.
            </p>
          </Clause>
          <Clause number="11.3">
            <p>
              We may moderate, edit, or remove reviews under that policy. Sustained poor ratings may
              reduce visibility or result in suspension or termination under clause 17.
            </p>
          </Clause>
          <DraftNote>
            A mutual survey system exists, but the standalone Review and Ratings Policy is not yet
            published.
          </DraftNote>
        </TermsSection>

        <TermsSection id="data-protection" number={12} title="Data Protection">
          <Clause number="12.1">
            <p>
              During use of the CM Platform and fulfilment of Bookings, you may access Customer
              Personal Information, including names, addresses, contact details, dietary
              requirements, and allergy information. You are bound by POPIA and other Applicable
              Laws and must process this information under POPIA and the Privacy Policy.
            </p>
          </Clause>
          <Clause number="12.2">
            <p>
              You may use Customer Personal Information only to accept and fulfil the relevant
              Booking. You may not retain, copy, share, sell, or otherwise process it beyond what is
              strictly necessary unless Applicable Laws require this.
            </p>
          </Clause>
          <Clause number="12.3">
            <p>
              You must maintain reasonable technical and organisational safeguards against
              unauthorised access, loss, destruction, or damage. Notify Chef Mate immediately of any
              actual or suspected breach and cooperate with investigation and remediation.
            </p>
          </Clause>
          <Clause number="12.4">
            <p>
              You must cooperate with data-subject requests under POPIA. On termination, immediately
              delete or return Customer Personal Information in your possession unless retention is
              legally required.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="insurance" number={13} title="Insurance">
          <Clause number="13.1">
            <p>
              You are solely responsible for obtaining and maintaining adequate insurance for your
              performance of Services, in amounts sufficient for reasonably foreseeable claims.
            </p>
          </Clause>
          <Clause number="13.2">
            <p>
              Chef Mate does not provide insurance coverage to Chefs and accepts no responsibility
              for loss, damage, or claims arising from a failure to maintain coverage. We may
              require proof of insurance as a condition of continued access.
            </p>
          </Clause>
          <DraftNote>
            Insurance evidence is not collected or enforced in the current application workflow.
          </DraftNote>
        </TermsSection>

        <TermsSection id="liability" number={14} title="Limitation of Liability" risk>
          <Clause number="14.1">
            <p className="font-bold text-red-950">
              The CM Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
              basis. Chef Mate does not warrant that it will be uninterrupted, secure, or
              error-free; that any number or frequency of Bookings will be available; that Customers
              will fulfil their obligations; or that the CM Platform will meet your specific
              requirements or expectations.
            </p>
          </Clause>
          <Clause number="14.2">
            <p className="font-bold text-red-950">
              Chef Mate is not liable for indirect, incidental, special, consequential, or punitive
              damages, including loss of profits, revenue, business, opportunity, or data, however
              arising.
            </p>
          </Clause>
          <Clause number="14.3">
            <p>
              Nothing excludes or limits liability that cannot be excluded or limited under
              Applicable Laws, including the CPA.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="indemnities" number={15} title="Indemnities" risk>
          <Clause number="15.1">
            <p className="font-bold text-red-950">
              You indemnify and hold harmless Chef Mate, its directors, officers, employees, agents,
              and affiliates against claims, demands, losses, damages, liabilities, costs, and
              expenses, including reasonable attorney-and-own-client legal costs, arising from:
            </p>
            <ol className={`${alphaListClass} font-bold text-red-950`}>
              <li>your performance or failure to perform Services;</li>
              <li>your breach of these Terms or another CM Policy;</li>
              <li>your breach of Applicable Laws, including food-safety and hygiene laws;</li>
              <li>
                Customer or third-party claims arising from your acts or omissions, including
                personal injury, illness, property damage, allergic reactions, or food
                contamination;
              </li>
              <li>misrepresentation of qualifications, experience, or certifications;</li>
              <li>infringement of intellectual-property rights by content you upload; and</li>
              <li>
                tax, penalties, or interest imposed on Chef Mate because you failed to comply with
                tax obligations.
              </li>
            </ol>
          </Clause>
          <Clause number="15.2">
            <p className="font-bold text-red-950">
              This indemnity survives termination and applies regardless of whether Chef Mate was
              negligent or contributed to the loss, to the fullest extent permitted by Applicable
              Laws.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="non-circumvention" number={16} title="Non-Circumvention">
          <Clause number="16.1">
            <p>
              You acknowledge that the CM Platform introduces Chefs and Customers and that Chef Mate
              invests in acquiring Customers and maintaining the marketplace. During these Terms and
              the Restricted Period, you must not directly or indirectly:
            </p>
            <ol className={alphaListClass}>
              <li>
                solicit or approach a Customer for personal-chef, meal-preparation, or substantially
                similar services outside the CM Platform;
              </li>
              <li>accept such an engagement outside the CM Platform;</li>
              <li>encourage or help a Customer book outside the CM Platform;</li>
              <li>provide personal contact details for arranging outside services; or</li>
              <li>assist a third party to circumvent the CM Platform in respect of a Customer.</li>
            </ol>
          </Clause>
          <Clause number="16.2">
            <p>
              For this clause, Customer means any person registered as a Customer at any time while
              you were registered as a Chef, whether or not you provided Services to them.
            </p>
          </Clause>
          <Clause number="16.3">
            <p>
              If you breach this clause, you are liable to pay Chef Mate, as a reasonable
              pre-estimate of damages and not a penalty, the Commission that would have been payable
              if the relevant Booking had used the CM Platform, without prejudice to other rights or
              remedies.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="suspension" number={17} title="Suspension and Termination">
          <Clause number="17.1">
            <p>We may suspend access, with or without notice, if we reasonably believe that:</p>
            <ol className={alphaListClass}>
              <li>you materially breached these Terms or another CM Policy;</li>
              <li>
                you acted unsafely, dishonestly, discriminatorily, or otherwise harmed Customers,
                Chefs, or the CM Platform&apos;s reputation;
              </li>
              <li>you no longer meet clause 5.2 eligibility criteria;</li>
              <li>you have sustained poor ratings or multiple Customer complaints;</li>
              <li>
                you failed to comply with Applicable Laws, including food-safety and hygiene laws;
              </li>
              <li>you are the subject of a complaint, investigation, or legal proceeding;</li>
              <li>continued access risks Customer safety or CM Platform integrity; or</li>
              <li>suspension is required by Applicable Laws or an Authority.</li>
            </ol>
          </Clause>
          <Clause number="17.2">
            <p>
              During suspension you cannot accept new Bookings and may lose access to features. We
              will use reasonable efforts to notify you of the reason and allow a response unless
              immediate suspension is required for safety or legal compliance.
            </p>
          </Clause>
          <Clause number="17.3">
            <p>
              We may terminate immediately without notice if a suspension ground applies and is
              incapable of remedy or is not remedied within a reasonable period after notice.
              Otherwise, we may terminate on 10 Business Days&apos; written notice.
            </p>
          </Clause>
          <Clause number="17.4">
            <p>
              You may terminate at any time by deactivating your CM Account, but remain bound by
              outstanding Booking, Payout, refund, non-circumvention, data-protection, and surviving
              obligations.
            </p>
          </Clause>
          <Clause number="17.5">
            <p>
              On termination, access is revoked; pending Bookings are cancelled under clause 9;
              outstanding Payouts are processed subject to deductions; and provisions intended to
              survive continue, including indemnity, data protection, non-circumvention, limitation
              of liability, and dispute resolution.
            </p>
          </Clause>
          <DraftNote>
            Infractions can be recorded, and suspended users are excluded from authentication and
            matching, but issuing an infraction does not currently change account status.
          </DraftNote>
        </TermsSection>

        <TermsSection id="complaints" number={18} title="Complaints Handling">
          <Clause number="18.1">
            <p>
              Chef Mate administers a complaints-handling process for certain disputes between Chefs
              and Customers. You agree to the separately published Complaints Handling Process and
              must cooperate with complaints or investigations, including providing reasonably
              requested information and documents.
            </p>
          </Clause>
          <Clause number="18.2">
            <p>
              Chef Mate facilitates resolution and is not an arbitrator or adjudicator, and does not
              assume liability for a complaint outcome. We may make final determinations on refunds,
              Payout adjustments, and platform access under the CM Policies. Unresolved disputes may
              be pursued through mechanisms under Applicable Laws.
            </p>
          </Clause>
          <DraftNote>
            The separately published Complaints Handling Process does not yet exist as a legal page.
          </DraftNote>
        </TermsSection>

        <TermsSection id="taxes" number={19} title="Taxes">
          <Clause number="19.1">
            <p>
              You are solely responsible for registering, filing, and paying taxes arising from use
              of the CM Platform and receipt of Payouts. Chef Mate does not determine, withhold, or
              remit taxes unless Applicable Laws require it.
            </p>
          </Clause>
          <Clause number="19.2">
            <p>
              If you are or become a VAT vendor, notify us immediately and provide your VAT number.
              Your Chef Fee is consideration for a taxable supply; you must account for VAT and
              issue required tax invoices; and Chef Mate is not liable for VAT you fail to account
              for.
            </p>
          </Clause>
          <Clause number="19.3">
            <p>
              If you are not VAT-registered, you warrant that turnover does not exceed the
              compulsory-registration threshold and will notify us immediately if it does.
            </p>
          </Clause>
          <Clause number="19.4">
            <p>
              You indemnify Chef Mate against tax, penalty, interest, or liability imposed by an
              Authority because you failed to comply with tax obligations.
            </p>
          </Clause>
        </TermsSection>

        <TermsSection id="general" number={20} title="General">
          <Clause number="20.1">
            <p>
              <strong>Intellectual Property:</strong> All rights in the CM Platform, including
              software, design, trademarks, logos, trade names, content, and documentation, remain
              Chef Mate&apos;s exclusive property. You receive no right, title, or interest in them.
              You grant Chef Mate a non-exclusive, royalty-free, worldwide licence to use,
              reproduce, and display content you upload for operating and promoting the CM Platform.
              You retain ownership of original content, while ratings, reviews, and feedback may be
              used under the CM Policies.
            </p>
          </Clause>
          <Clause number="20.2">
            <p>
              <strong>Force Majeure:</strong> Neither Party is liable for failure or delay caused by
              Force Majeure. The affected Party must notify the other as soon as practicable and
              reasonably mitigate the effects. If the event continues for more than 30 Business
              Days, either Party may terminate by written notice.
            </p>
          </Clause>
          <Clause number="20.3">
            <p>
              <strong>Dispute Resolution:</strong> The Parties will try in good faith for at least
              30 Business Days to resolve a dispute arising from these Terms. If unresolved, either
              may refer it to mediation administered by the Arbitration Foundation of Southern
              Africa under its mediation rules. If mediation fails within 14 Business Days after
              referral, either may institute proceedings in a competent court.
            </p>
          </Clause>
          <Clause number="20.4">
            <p>
              <strong>Governing Law and Jurisdiction:</strong> South African law governs these
              Terms. The Parties consent to the non-exclusive jurisdiction of the High Court of
              South Africa, Gauteng Division, Johannesburg.
            </p>
          </Clause>
          <Clause number="20.5">
            <p>
              <strong>Contact:</strong> Notices must be written and delivered to the registered
              email address on file and are deemed received on the Business Day after transmission.
              Contact Chef Mate at{" "}
              <a className="underline" href="mailto:support@chefmate.co.za">
                support@chefmate.co.za
              </a>
              .
            </p>
          </Clause>
          <Clause number="20.6">
            <p>
              <strong>Whole Agreement:</strong> These Terms and the other CM Policies are the entire
              agreement regarding your use of the CM Platform as a Chef and supersede prior
              negotiations, representations, warranties, and understandings on the subject.
            </p>
          </Clause>
          <Clause number="20.7">
            <p>
              <strong>Survival:</strong> Provisions intended to survive termination do so, including
              indemnity, data protection, non-circumvention, intellectual property, limitation of
              liability, tax, and dispute resolution.
            </p>
          </Clause>
          <Clause number="20.8">
            <p>
              <strong>Waiver:</strong> A failure or delay in exercising a right is not a waiver. A
              single or partial exercise does not prevent later exercise of that or another right.
            </p>
          </Clause>
          <Clause number="20.9">
            <p>
              <strong>Severability:</strong> If a competent court finds a provision invalid,
              unlawful, or unenforceable, it is severed and the rest continues. The Parties will
              negotiate a replacement that most closely achieves its commercial intention.
            </p>
          </Clause>
          <Clause number="20.10">
            <p>
              <strong>Cession and Assignment:</strong> You may not cede, assign, or transfer rights
              or obligations without prior written consent. Chef Mate may transfer its rights and
              obligations to an affiliate or successor without consent if this does not materially
              diminish your rights.
            </p>
          </Clause>
          <Clause number="20.11">
            <p>
              <strong>Amendment:</strong> Chef Mate may amend these Terms. We will notify you of
              material changes by publishing updated Terms and emailing your registered address.
              Continued use after notification constitutes acceptance. If you disagree, discontinue
              use and deactivate your CM Account.
            </p>
          </Clause>
        </TermsSection>
      </div>

      <footer className="mt-12 border-t border-[var(--color-oxblood)]/10 pt-6 text-sm text-[var(--color-charcoal)]/55">
        <p>
          <strong>Draft date:</strong> 18 August 2026
        </p>
        <p className="mt-2">
          This preview is intentionally excluded from policy acceptance until all activation
          blockers above are closed.
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
