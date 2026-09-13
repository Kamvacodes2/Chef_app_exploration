import type { ReactNode } from "react";
import Link from "next/link";

const contents = [
  ["introduction", "Introduction and Purpose"],
  ["responsible-party", "Responsible Party and Information Officer"],
  ["personal-info-collected", "Personal Information We Collect"],
  ["special-personal-info", "Special Personal Information and Biometrics"],
  ["children-privacy", "Personal Information of Children"],
  ["lawful-grounds", "Lawful Grounds for Processing"],
  ["processing-purposes", "Purposes for Which We Process Information"],
  ["background-checks", "HURU and Afiswitch Background Verification"],
  ["sharing-operators", "Sharing Information with Third Parties and Operators"],
  ["cross-border", "Cross-Border Data Transfers"],
  ["data-security", "Data Security and Technical Safeguards"],
  ["security-compromises", "Security Compromises and Incident Management"],
  ["retention-destruction", "Data Retention and Destruction"],
  ["data-subject-rights", "Your Data Subject Rights Under POPIA"],
  ["direct-marketing", "Direct Marketing and Electronic Communications"],
  ["cookies-tracking", "Cookies and Tracking Technologies"],
  ["regulator-complaints", "Queries, Complaints, and the Information Regulator"],
] as const;

interface SectionProps {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly children: ReactNode;
}

function PrivacySection({ id, number, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-black text-[var(--color-charcoal)]">
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

const alphaListClass = "list-[lower-alpha] space-y-2 pl-6";

export default function PrivacyPolicyPage() {
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
            POPIA-Compliant Privacy Policy
          </p>
          <span className="rounded-full bg-[var(--color-oxblood)]/10 px-3 py-1 text-xs font-bold text-[var(--color-oxblood)]">
            Effective Date: 13 September 2026
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/80">
          Chef Mate Proprietary Limited is committed to protecting your personal privacy in strict
          accordance with the Protection of Personal Information Act 4 of 2013 (POPIA) and other
          applicable data protection laws. This Privacy Policy outlines how we collect, use, disclose,
          and safeguard your personal information.
        </p>
      </header>

      <nav
        aria-label="Privacy contents"
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
        <PrivacySection id="introduction" number={1} title="Introduction and Purpose">
          <Clause number="1.1">
            <p>
              This Privacy Policy explains how <strong>Chef Mate Proprietary Limited</strong> (registration
              number 2026/593342/07) (<strong>Chef Mate</strong>, <strong>we</strong>, <strong>us</strong>, or{" "}
              <strong>our</strong>) collects, processes, stores, shares, and protects Personal Information
              obtained from Customers, Chef applicants, verified Chefs, visitors, and users of the CM Platform (
              <Link className="underline" href="https://chefmate.co.za">
                https://chefmate.co.za
              </Link>
              ).
            </p>
          </Clause>
          <Clause number="1.2">
            <p>
              We process all Personal Information in compliance with the eight statutory conditions for
              lawful processing set out in Chapter 3 of the Protection of Personal Information Act 4 of
              2013 (<strong>POPIA</strong>) and other applicable South African legislation.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="responsible-party" number={2} title="Responsible Party and Information Officer">
          <Clause number="2.1">
            <p>
              Chef Mate is the <strong>Responsible Party</strong> in respect of Personal Information
              processed through the CM Platform and operations.
            </p>
          </Clause>
          <Clause number="2.2">
            <p>Our designated Information Officer and Deputy Information Officer details are as follows:</p>
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4">
              <p className="font-bold text-[var(--color-charcoal)]">Information Officer</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">Name: Neliswa Ncama</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">
                Email:{" "}
                <a className="font-semibold text-[var(--color-oxblood)] underline" href="mailto:privacy@chefmate.co.za">
                  privacy@chefmate.co.za
                </a>
              </p>

              <p className="mt-3 font-bold text-[var(--color-charcoal)]">Deputy Information Officer</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">Name: Kamva Soga</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">
                Email:{" "}
                <a className="font-semibold text-[var(--color-oxblood)] underline" href="mailto:privacy@chefmate.co.za">
                  privacy@chefmate.co.za
                </a>
              </p>

              <div className="mt-3 border-t border-[var(--color-oxblood)]/10 pt-2 text-xs text-[var(--color-charcoal)]/80">
                <p><strong>Physical Address:</strong> 97 Waterfall Avenue, Craighall, Johannesburg, Gauteng, 2196, South Africa</p>
                <p><strong>General Support:</strong> support@chefmate.co.za</p>
              </div>
            </div>
          </Clause>
        </PrivacySection>

        <PrivacySection id="personal-info-collected" number={3} title="Personal Information We Collect">
          <Clause number="3.1">
            <p>Depending on your role and engagement with the CM Platform, we collect and process:</p>
            <ol className={alphaListClass}>
              <li>
                <strong>Identity and Contact Data:</strong> Full legal names, South African identity numbers or passport numbers, date of birth, nationality, email address, physical address, and mobile phone number;
              </li>
              <li>
                <strong>Customer Profile &amp; Booking Data:</strong> Residential delivery addresses, gate codes, kitchen specifications, meal preferences, guest counts, scheduling requirements, booking history, and support correspondence;
              </li>
              <li>
                <strong>Chef Professional Data:</strong> Culinary qualifications, food safety &amp; hygiene training certificates (QCTO accredited), work experience, portfolio dishes, service radius, and availability calendars;
              </li>
              <li>
                <strong>Financial and Transactional Data:</strong> Payment transaction references, payout bank account details (for Chefs), billing receipts, invoice history, and refund records (we do not store full credit card numbers);
              </li>
              <li>
                <strong>Technical and Usage Data:</strong> IP addresses, browser types, operating systems, device identifiers, login timestamps, pages viewed, and session telemetry.
              </li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="special-personal-info" number={4} title="Special Personal Information and Biometrics">
          <Clause number="4.1">
            <p>
              In terms of Sections 26–33 of POPIA, the prohibition on processing <strong>Special Personal Information</strong> applies
              unless a specific statutory exception or express consent is obtained.
            </p>
          </Clause>
          <Clause number="4.2">
            <p>We process Special Personal Information solely under the following conditions:</p>
            <ol className={alphaListClass}>
              <li>
                <strong>Health &amp; Allergy Data:</strong> Customers voluntarily disclose dietary restrictions, food allergies, and health-related dietary preferences to ensure safe meal preparation. Processing is based on the Customer&apos;s explicit consent and vital health interests;
              </li>
              <li>
                <strong>Biometric Information:</strong> Digital fingerprints and biometric identifiers of Chef applicants are processed exclusively for criminal background verification through HURU and Afiswitch;
              </li>
              <li>
                <strong>Criminal Record Information:</strong> Criminal record check reports for Chefs are processed in accordance with Section 32 of POPIA to protect the safety, security, and property of Customers.
              </li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="children-privacy" number={5} title="Personal Information of Children">
          <Clause number="5.1">
            <p>
              The CM Platform is strictly intended for individuals who are 18 years of age or older.
              We do not knowingly collect or process Personal Information relating to children (under 18
              years) without the express consent of a parent or competent legal guardian in accordance
              with Section 35 of POPIA.
            </p>
          </Clause>
          <Clause number="5.2">
            <p>
              Where dietary preferences or allergies for minor household members are provided by a parent
              for meal planning, such information is processed solely with the parent&apos;s consent.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="lawful-grounds" number={6} title="Lawful Grounds for Processing">
          <Clause number="6.1">
            <p>In accordance with Section 11 of POPIA, Chef Mate processes Personal Information only where:</p>
            <ol className={alphaListClass}>
              <li>the data subject (or competent person) has consented to the processing;</li>
              <li>processing is necessary to conclude or perform a contract to which the data subject is party (e.g., fulfilling a Booking);</li>
              <li>processing complies with an obligation imposed on Chef Mate by law (e.g., tax, consumer, or accounting laws);</li>
              <li>processing protects a legitimate interest of the data subject (e.g., vital allergen safety); or</li>
              <li>processing is necessary for pursuing the legitimate interests of Chef Mate or of a third party to whom the information is supplied.</li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="processing-purposes" number={7} title="Purposes for Which We Process Information">
          <Clause number="7.1">
            <p>We process Personal Information for the following legitimate purposes:</p>
            <ol className={alphaListClass}>
              <li>verifying eligibility, qualifications, and background of Chef applicants;</li>
              <li>creating, maintaining, and securing customer and chef accounts;</li>
              <li>facilitating matching, scheduling, communication, and fulfillment of Bookings;</li>
              <li>disclosing necessary booking details (such as address and dietary requirements) to the confirmed Chef;</li>
              <li>processing customer payments and executing weekly chef payouts;</li>
              <li>investigating and resolving disputes, safety incidents, food quality complaints, and reviews;</li>
              <li>complying with applicable statutory, tax, consumer protection, and accounting duties;</li>
              <li>detecting, preventing, and prosecuting fraud, abuse, or unauthorized platform use;</li>
              <li>improving platform performance, UX design, customer support, and system security.</li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="background-checks" number={8} title="HURU and Afiswitch Background Verification">
          <Clause number="8.1">
            <p>
              Chef Mate partners with <strong>HURU</strong> and its authorized <strong>Afiswitch</strong> Criminal
              Background Check (CBC) service to conduct criminal background checks on all adult Chef applicants.
            </p>
          </Clause>
          <Clause number="8.2">
            <p>
              <strong>Specific Affirmative Consent:</strong> Before a background check is initiated, we explain the
              specific purpose and obtain the person&apos;s affirmative, purpose-specific consent; general acceptance of
              this policy is not treated as that consent.
            </p>
          </Clause>
          <Clause number="8.3">
            <p>
              Biometric fingerprints and identity data are transmitted to HURU/Afiswitch to interface with the
              South African Police Service (SAPS) and the Home Affairs National Identification System (HANIS).
              Biometric information and criminal-record information are special personal information under POPIA.
            </p>
          </Clause>
          <Clause number="8.4">
            <p>
              <strong>Human Review:</strong> Chef Mate ensures that it does not reject, suspend, or terminate a person
              solely through automated processing. Background check results are reviewed by trained personnel with full
              consideration of relevance, context, rehabilitation, and any representations provided by the candidate.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="sharing-operators" number={9} title="Sharing Information with Third Parties and Operators">
          <Clause number="9.1">
            <p>We do not sell, rent, or trade Personal Information to third parties for commercial gain.</p>
          </Clause>
          <Clause number="9.2">
            <p>We disclose Personal Information strictly on a need-to-know basis to:</p>
            <ol className={alphaListClass}>
              <li>
                <strong>Matched Chefs and Customers:</strong> Sharing necessary contact and address details to enable service delivery;
              </li>
              <li>
                <strong>Payment and Banking Gateways:</strong> Securely processing electronic card payments and bank payouts;
              </li>
              <li>
                <strong>Service Providers and Operators:</strong> Hosting infrastructure, database providers, SMS/WhatsApp delivery gateways, email delivery systems, and verification partners (all bound by Section 21 POPIA operator agreements);
              </li>
              <li>
                <strong>Professional Advisors and Insurers:</strong> Legal counsel, auditors, and insurance underwriters where necessary to manage risk and enforce rights;
              </li>
              <li>
                <strong>Law Enforcement and Regulators:</strong> When required by subpoena, court order, or statutory reporting duty.
              </li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="cross-border" number={10} title="Cross-Border Data Transfers">
          <Clause number="10.1">
            <p>
              In terms of Section 72 of POPIA, Chef Mate may transfer Personal Information outside the
              Republic of South Africa (e.g., to cloud hosting facilities or SaaS infrastructure providers)
              only where:
            </p>
            <ol className={alphaListClass}>
              <li>the recipient country has data protection laws providing substantially similar protection as POPIA;</li>
              <li>the transfer is subject to a binding agreement or standard contractual clauses imposing POPIA-equivalent data protection obligations; or</li>
              <li>the data subject has consented to the cross-border transfer.</li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="data-security" number={11} title="Data Security and Technical Safeguards">
          <Clause number="11.1">
            <p>
              In accordance with Section 19 of POPIA, Chef Mate implements appropriate, reasonable technical
              and organizational measures to prevent loss, damage, unauthorized destruction, and unlawful access to Personal Information.
            </p>
          </Clause>
          <Clause number="11.2">
            <p>These safeguards include:</p>
            <ol className={alphaListClass}>
              <li>end-to-end TLS/HTTPS encryption of all data in transit;</li>
              <li>AES-256 encryption of sensitive data and access tokens at rest;</li>
              <li>role-based access controls (RBAC) and least-privilege administrative access;</li>
              <li>routine vulnerability assessments, penetration testing, and automated vulnerability monitoring;</li>
              <li>strict confidentiality undertakings for all employees and contractors.</li>
            </ol>
          </Clause>
        </PrivacySection>

        <PrivacySection id="security-compromises" number={12} title="Security Compromises and Incident Management">
          <Clause number="12.1">
            <p>
              If there are reasonable grounds to believe that the Personal Information of a data subject
              has been accessed or acquired by any unauthorized person, Chef Mate will, in terms of Section
              22 of POPIA, notify:
            </p>
            <ol className={alphaListClass}>
              <li>the Information Regulator; and</li>
              <li>the affected data subjects, as soon as reasonably possible after the discovery of the compromise.</li>
            </ol>
          </Clause>
          <Clause number="12.2">
            <p>
              The notification will provide details of the incident, the nature of the compromise, suspected
              consequences, and the measures taken to mitigate potential adverse effects.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="retention-destruction" number={13} title="Data Retention and Destruction">
          <Clause number="13.1">
            <p>
              In terms of Section 14 of POPIA, records of Personal Information are not retained any longer
              than is necessary for achieving the purpose for which the information was collected, unless:
            </p>
            <ol className={alphaListClass}>
              <li>retention is required or authorized by law (e.g., 5-year tax record retention under South African revenue laws);</li>
              <li>Chef Mate reasonably requires the record for lawful purposes related to its functions;</li>
              <li>retention is required by a contract between the parties; or</li>
              <li>the data subject has consented to longer retention.</li>
            </ol>
          </Clause>
          <Clause number="13.2">
            <p>
              When the retention period expires, records are permanently deleted, securely destroyed, or
              irreversibly de-identified in a manner that prevents reconstruction.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="data-subject-rights" number={14} title="Your Data Subject Rights Under POPIA">
          <Clause number="14.1">
            <p>As a data subject under POPIA, you possess the following statutory rights:</p>
            <ol className={alphaListClass}>
              <li>
                <strong>Right of Access (Section 23):</strong> You may request confirmation of whether we hold Personal Information about you, and request a copy of the record;
              </li>
              <li>
                <strong>Right to Correction or Deletion (Section 24):</strong> You may request the correction, destruction, or deletion of inaccurate, irrelevant, excessive, outdated, incomplete, misleading, or unlawfully obtained information;
              </li>
              <li>
                <strong>Right to Object (Section 11(3)):</strong> You may object, on reasonable grounds relating to your particular situation, to the processing of your Personal Information where processing is based on legitimate interests;
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Where processing is based on your consent, you may withdraw that consent at any time, subject to legal or contractual restrictions;
              </li>
              <li>
                <strong>Right to Complain:</strong> You may submit a complaint to our Information Officer or to the Information Regulator.
              </li>
            </ol>
          </Clause>
          <Clause number="14.2">
            <p>
              To exercise any of these rights, please submit a written request to our Information Officer at{" "}
              <a className="font-semibold text-[var(--color-oxblood)] underline" href="mailto:privacy@chefmate.co.za">
                privacy@chefmate.co.za
              </a>
              .
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="direct-marketing" number={15} title="Direct Marketing and Electronic Communications">
          <Clause number="15.1">
            <p>
              In compliance with Section 69 of POPIA, Chef Mate only sends direct electronic marketing communications
              to data subjects who have consented (opted-in) to receive such communications, or who are existing
              customers in respect of similar services.
            </p>
          </Clause>
          <Clause number="15.2">
            <p>
              Every marketing email and SMS includes an immediate, free, and functional unsubscribe link or mechanism.
              Transactional and operational notifications (e.g., booking confirmations, chef arrival alerts, password resets)
              are not direct marketing and cannot be opted out of while an active account or booking is maintained.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="cookies-tracking" number={16} title="Cookies and Tracking Technologies">
          <Clause number="16.1">
            <p>
              The CM Platform uses cookies and similar web technologies to ensure core functionality,
              remember preferences, authenticate sessions, and collect aggregated performance metrics.
            </p>
          </Clause>
          <Clause number="16.2">
            <p>
              You can configure your web browser to block or alert you to cookies; however, disabling strictly
              necessary cookies may affect the availability and functionality of booking and authentication features.
            </p>
          </Clause>
        </PrivacySection>

        <PrivacySection id="regulator-complaints" number={17} title="Queries, Complaints, and the Information Regulator">
          <Clause number="17.1">
            <p>
              If you have any questions about this Privacy Policy or wish to lodge a privacy grievance, please
              contact the Chef Mate Information Officer:
            </p>
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4 text-xs">
              <p className="font-bold text-[var(--color-charcoal)]">Chef Mate Information Officer</p>
              <p>Email: privacy@chefmate.co.za</p>
              <p>Physical Address: 97 Waterfall Avenue, Craighall, Johannesburg, Gauteng, 2196, South Africa</p>
            </div>
          </Clause>
          <Clause number="17.2">
            <p>
              You also have the statutory right to lodge a complaint directly with the{" "}
              <strong>Information Regulator (South Africa)</strong>:
            </p>
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4 text-xs">
              <p className="font-bold text-[var(--color-charcoal)]">The Information Regulator (South Africa)</p>
              <p><strong>Physical Address:</strong> JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
              <p><strong>Postal Address:</strong> P.O Box 31533, Braamfontein, Johannesburg, 2017</p>
              <p>
                <strong>Complaints Email:</strong>{" "}
                <a className="underline" href="mailto:POPIAComplaints@inforegulator.org.za">
                  POPIAComplaints@inforegulator.org.za
                </a>{" "}
                /{" "}
                <a className="underline" href="mailto:PAIAComplaints@inforegulator.org.za">
                  PAIAComplaints@inforegulator.org.za
                </a>
              </p>
              <p>
                <strong>General Inquiries:</strong>{" "}
                <a className="underline" href="mailto:enquiries@inforegulator.org.za">
                  enquiries@inforegulator.org.za
                </a>
              </p>
              <p>
                <strong>Website:</strong>{" "}
                <a className="underline" href="https://inforegulator.org.za" target="_blank" rel="noreferrer">
                  https://inforegulator.org.za
                </a>
              </p>
            </div>
          </Clause>
        </PrivacySection>
      </div>
    </article>
  );
}
