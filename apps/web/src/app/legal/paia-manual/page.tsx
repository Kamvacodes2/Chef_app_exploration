import type { ReactNode } from "react";
import Link from "next/link";

const contents = [
  ["introduction", "Introduction and Purpose of this Manual"],
  ["company-details", "Company Details and Structure"],
  ["contact-details", "Contact Details of Information Officer"],
  ["section-10-guide", "The Section 10 Guide on How to Use PAIA"],
  ["automatic-records", "Records Available Automatically Without Formal Request"],
  ["legislative-records", "Records Held in Accordance with Other Legislation"],
  ["subjects-categories", "Subjects and Categories of Records Held by Chef Mate"],
  ["popia-processing", "Processing of Personal Information (POPIA Section 51)"],
  ["request-procedure", "Procedure for Requesting Access to Records"],
  ["prescribed-fees", "Prescribed Fees"],
  ["grounds-refusal", "Grounds for Refusal of Access to Records"],
  ["remedies-refusal", "Remedies Available on Refusal of a Request"],
  ["availability-manual", "Availability and Updating of this Manual"],
  ["annexure-a", "Annexure A: Prescribed Form 2 & Fee Schedule"],
] as const;

interface SectionProps {
  readonly id: string;
  readonly number: number | string;
  readonly title: string;
  readonly children: ReactNode;
}

function PAIASection({ id, number, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-xl font-black text-[var(--color-charcoal)]">
        {typeof number === "number" ? `${number}. ` : ""}{title}
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

export default function PAIAManualPage() {
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
            PAIA Section 51 Statutory Manual
          </p>
          <span className="rounded-full bg-[var(--color-oxblood)]/10 px-3 py-1 text-xs font-bold text-[var(--color-oxblood)]">
            Effective Date: 13 September 2026
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          PAIA Manual (Section 51)
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/80">
          This manual is prepared in accordance with Section 51 of the Promotion of Access to Information
          Act 2 of 2000 (PAIA), as amended by the Protection of Personal Information Act 4 of 2013 (POPIA),
          for <strong>Chef Mate Proprietary Limited</strong>.
        </p>
      </header>

      <nav
        aria-label="PAIA manual contents"
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
        <PAIASection id="introduction" number={1} title="Introduction and Purpose of this Manual">
          <Clause number="1.1">
            <p>
              The Promotion of Access to Information Act 2 of 2000 (<strong>PAIA</strong>) gives effect to
              the constitutional right of access to any information held by the State and any information that
              is held by another person and that is required for the exercise or protection of any rights.
            </p>
          </Clause>
          <Clause number="1.2">
            <p>
              The purpose of this Manual is to facilitate requests for access to records held by{" "}
              <strong>Chef Mate Proprietary Limited</strong> (a private body) and to outline the categories
              of records held, the procedures for requesting access, and the grounds on which access may be granted or refused.
            </p>
          </Clause>
        </PAIASection>

        <PAIASection id="company-details" number={2} title="Company Details and Structure">
          <Clause number="2.1">
            <p>
              Chef Mate operates a two-sided digital marketplace facilitating introductions, bookings,
              communications, and secure payment processing between private Customers and verified independent Chefs.
            </p>
          </Clause>
          <Clause number="2.2">
            <div className="rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4">
              <p className="font-bold text-[var(--color-charcoal)]">Chef Mate Proprietary Limited</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">Registration Number: 2026/593342/07</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">VAT Registration: Pending / Applied</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">Country of Incorporation: Republic of South Africa</p>
              <p className="text-xs text-[var(--color-charcoal)]/80">Website: https://chefmate.co.za</p>
            </div>
          </Clause>
        </PAIASection>

        <PAIASection id="contact-details" number={3} title="Contact Details of Information Officer">
          <Clause number="3.1">
            <p>
              The Head of the Private Body has designated the Information Officer and Deputy Information
              Officer responsible for handling requests for access to records under PAIA:
            </p>
            <div className="mt-2 grid gap-4 rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4 sm:grid-cols-2">
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">Information Officer</p>
                <p className="text-xs"><strong>Name:</strong> Neliswa Ncama</p>
                <p className="text-xs">
                  <strong>Email:</strong>{" "}
                  <a className="underline" href="mailto:privacy@chefmate.co.za">
                    privacy@chefmate.co.za
                  </a>
                </p>
              </div>
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">Deputy Information Officer</p>
                <p className="text-xs"><strong>Name:</strong> Kamva Soga</p>
                <p className="text-xs">
                  <strong>Email:</strong>{" "}
                  <a className="underline" href="mailto:privacy@chefmate.co.za">
                    privacy@chefmate.co.za
                  </a>
                </p>
              </div>
              <div className="sm:col-span-2 border-t border-[var(--color-oxblood)]/10 pt-2 text-xs">
                <p><strong>Physical Address:</strong> 97 Waterfall Avenue, Craighall, Johannesburg, Gauteng, 2196, South Africa</p>
                <p><strong>Postal Address:</strong> 97 Waterfall Avenue, Craighall, Johannesburg, Gauteng, 2196, South Africa</p>
              </div>
            </div>
          </Clause>
        </PAIASection>

        <PAIASection id="section-10-guide" number={4} title="The Section 10 Guide on How to Use PAIA">
          <Clause number="4.1">
            <p>
              The Information Regulator of South Africa has compiled a Guide, in terms of Section 10 of PAIA,
              which contains information to assist any person wishing to exercise any right contemplated in PAIA and POPIA.
            </p>
          </Clause>
          <Clause number="4.2">
            <p>
              The Guide is available in each of the official languages of South Africa and may be inspected at or obtained from:
            </p>
            <div className="mt-2 rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4 text-xs">
              <p className="font-bold">The Information Regulator (South Africa)</p>
              <p>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
              <p>Website: <a className="underline" href="https://inforegulator.org.za" target="_blank" rel="noreferrer">https://inforegulator.org.za</a></p>
              <p>Email: <a className="underline" href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a></p>
            </div>
          </Clause>
        </PAIASection>

        <PAIASection id="automatic-records" number={5} title="Records Available Automatically Without Formal Request">
          <Clause number="5.1">
            <p>
              In terms of Section 52 of PAIA, the following categories of records are automatically available
              on our website (
              <Link className="underline" href="https://chefmate.co.za">
                https://chefmate.co.za
              </Link>
              ) without having to submit a formal PAIA request:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Public website content and platform marketing materials;</li>
              <li>Published policies: Customer Terms, Chef Agreement, Privacy Policy, Platform Rules, Complaints Handling Process, Review &amp; Ratings Policy;</li>
              <li>General platform FAQs and chef onboarding guidelines;</li>
              <li>Press releases and public promotional announcements.</li>
            </ul>
          </Clause>
        </PAIASection>

        <PAIASection id="legislative-records" number={6} title="Records Held in Accordance with Other Legislation">
          <Clause number="6.1">
            <p>
              Chef Mate maintains statutory and operational records in accordance with various South African
              statutes, including but not limited to:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Basic Conditions of Employment Act 75 of 1997;</li>
              <li>Companies Act 71 of 2008;</li>
              <li>Compensation for Occupational Injuries and Diseases Act 130 of 1993;</li>
              <li>Consumer Protection Act 68 of 2008;</li>
              <li>Electronic Communications and Transactions Act 25 of 2002;</li>
              <li>Employment Equity Act 55 of 1998;</li>
              <li>Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972 and Hygiene Regulations;</li>
              <li>Income Tax Act 58 of 1962 and Tax Administration Act 28 of 2011;</li>
              <li>Labour Relations Act 66 of 1995;</li>
              <li>Occupational Health and Safety Act 85 of 1993;</li>
              <li>Protection of Personal Information Act 4 of 2013;</li>
              <li>Value-Added Tax Act 89 of 1991.</li>
            </ul>
          </Clause>
        </PAIASection>

        <PAIASection id="subjects-categories" number={7} title="Subjects and Categories of Records Held by Chef Mate">
          <Clause number="7.1">
            <p>Chef Mate holds records under the following operational subjects and categories:</p>
            <div className="space-y-3">
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">A. Statutory and Corporate Governance Records</p>
                <p className="text-xs">Memorandum of Incorporation, Certificate of Incorporation (COR14.3), share registers, board minutes, resolutions, and statutory director filings.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">B. Financial and Accounting Records</p>
                <p className="text-xs">Annual financial statements, tax returns, VAT records, banking statements, general ledgers, chef payout ledgers, customer receipts, and audit files.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">C. Chef Partner Records</p>
                <p className="text-xs">Application records, identity documents, culinary qualifications, food hygiene certificates, HURU/Afiswitch background check reports, service history, and performance metrics.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">D. Customer and Booking Records</p>
                <p className="text-xs">Customer profiles, contact records, session booking details, addresses, dietary and allergen disclosures, transaction logs, and review records.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">E. Technical and Platform Records</p>
                <p className="text-xs">Source code, software architecture, infrastructure logs, access control records, data security policies, and incident investigation files.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--color-charcoal)]">F. Legal, Compliance, and Dispute Records</p>
                <p className="text-xs">Commercial contracts, insurance policies, non-disclosure agreements, complaints dossiers, regulatory correspondence, and legal opinions.</p>
              </div>
            </div>
          </Clause>
        </PAIASection>

        <PAIASection id="popia-processing" number={8} title="Processing of Personal Information (POPIA Section 51)">
          <Clause number="8.1">
            <p>
              In terms of Section 51(1)(c) of PAIA, read with POPIA, this Manual specifies:
            </p>
            <ol className={alphaListClass}>
              <li>
                <strong>Purpose of Processing:</strong> Managing marketplace operations, validating chef qualifications and background safety, processing bookings, customer care, tax compliance, and platform security;
              </li>
              <li>
                <strong>Categories of Data Subjects:</strong> Customers, Chef applicants, verified Chefs, employees, contractors, suppliers, and website visitors;
              </li>
              <li>
                <strong>Categories of Personal Information:</strong> Identifying information, contact details, special personal information (health/allergies and criminal record verification for chefs), and transaction data;
              </li>
              <li>
                <strong>Recipients of Information:</strong> Matched chefs/customers, payment processors, cloud hosting operators, verification providers (HURU/Afiswitch), professional advisors, and regulatory authorities;
              </li>
              <li>
                <strong>Cross-Border Transfers:</strong> Data stored with cloud hosting and infrastructure providers complying with Section 72 of POPIA;
              </li>
              <li>
                <strong>Information Security Measures:</strong> Robust technical safeguards including encryption (TLS/HTTPS and AES-256), access logging, MFA, and organizational policies.
              </li>
            </ol>
          </Clause>
        </PAIASection>

        <PAIASection id="request-procedure" number={9} title="Procedure for Requesting Access to Records">
          <Clause number="9.1">
            <p>
              To request access to a record not automatically available, a requester must:
            </p>
            <ol className={alphaListClass}>
              <li>
                Complete the prescribed <strong>Form 2</strong> (Request for Access to Record of Private Body), attached as Annexure A to this Manual;
              </li>
              <li>
                Submit the completed form together with proof of identity (certified copy of ID/passport) to the Information Officer at{" "}
                <a className="underline" href="mailto:privacy@chefmate.co.za">
                  privacy@chefmate.co.za
                </a>{" "}
                or deliver it to our registered physical address;
              </li>
              <li>
                Provide sufficient detail on the request form to enable the Information Officer to identify the record and the requester;
              </li>
              <li>
                Clearly specify the right the requester is seeking to exercise or protect and explain why the requested record is required for the exercise or protection of that right;
              </li>
              <li>
                Pay the prescribed request fee (unless exempt).
              </li>
            </ol>
          </Clause>
          <Clause number="9.2">
            <p>
              <strong>Response Timeframe:</strong> The Information Officer will process the request within{" "}
              <strong>30 calendar days</strong> of receipt, unless an extension (for a further period not exceeding 30 days) is justified
              under Section 57 of PAIA due to the volume of records or complex searches required.
            </p>
          </Clause>
        </PAIASection>

        <PAIASection id="prescribed-fees" number={10} title="Prescribed Fees">
          <Clause number="10.1">
            <p>PAIA provides for two types of fees:</p>
            <ol className={alphaListClass}>
              <li>
                <strong>Request Fee:</strong> A non-refundable fee payable upon submitting a request (currently R140.00 for private bodies), unless the requester is requesting access to their own personal record (personal requesters are exempt from the request fee);
              </li>
              <li>
                <strong>Access Fee:</strong> Payable if the request is granted, covering the costs of searching for, preparing, reproducing, and transcribing the requested record in the requested format.
              </li>
            </ol>
          </Clause>
          <Clause number="10.2">
            <p>
              If the search and preparation requires more than six hours, a deposit equal to one-third of the access fee may be required before the search proceeds.
            </p>
          </Clause>
        </PAIASection>

        <PAIASection id="grounds-refusal" number={11} title="Grounds for Refusal of Access to Records">
          <Clause number="11.1">
            <p>
              Chef Mate may or must refuse a request for access to a record on the grounds set out in Chapter 4 of PAIA, including:
            </p>
            <ol className={alphaListClass}>
              <li>
                <strong>Section 63:</strong> Mandatory protection of the privacy of a third party who is a natural person (including a deceased individual);
              </li>
              <li>
                <strong>Section 64:</strong> Mandatory protection of the commercial information of a third party (trade secrets, financial, scientific, or technical information);
              </li>
              <li>
                <strong>Section 65:</strong> Mandatory protection of confidential information of third parties protected by an agreement;
              </li>
              <li>
                <strong>Section 66:</strong> Mandatory protection of the safety of individuals and the protection of property;
              </li>
              <li>
                <strong>Section 67:</strong> Mandatory protection of records privileged from production in legal proceedings;
              </li>
              <li>
                <strong>Section 68:</strong> Protection of the commercial activities and trade secrets of Chef Mate itself;
              </li>
              <li>
                <strong>Section 69:</strong> Protection of research information of a third party or of Chef Mate.
              </li>
            </ol>
          </Clause>
        </PAIASection>

        <PAIASection id="remedies-refusal" number={12} title="Remedies Available on Refusal of a Request">
          <Clause number="12.1">
            <p>
              <strong>No Internal Appeal:</strong> As a private body, Chef Mate does not have an internal appeal procedure. The decision of the Information Officer is final.
            </p>
          </Clause>
          <Clause number="12.2">
            <p>
              If a request is refused or not responded to within the statutory timeframe, the requester may, within <strong>180 days</strong> of receiving the decision:
            </p>
            <ol className={alphaListClass}>
              <li>
                Lodge a complaint with the <strong>Information Regulator</strong> in terms of Section 77A of PAIA; or
              </li>
              <li>
                Apply to the <strong>High Court</strong> or a Magistrate&apos;s Court of competent jurisdiction for appropriate relief under Section 78 of PAIA.
              </li>
            </ol>
          </Clause>
        </PAIASection>

        <PAIASection id="availability-manual" number={13} title="Availability and Updating of this Manual">
          <Clause number="13.1">
            <p>
              This Manual is available for inspection, free of charge, at the registered office of Chef Mate (97 Waterfall Avenue, Craighall, Johannesburg) during standard business hours.
            </p>
          </Clause>
          <Clause number="13.2">
            <p>
              This Manual is also published on our website at{" "}
              <Link className="underline" href="/legal/paia-manual">
                https://chefmate.co.za/legal/paia-manual
              </Link>
              , and a copy has been made available to the Information Regulator. This Manual is reviewed and updated annually or whenever material changes occur.
            </p>
          </Clause>
        </PAIASection>

        <PAIASection id="annexure-a" number="Annexure A" title="Annexure A: Prescribed Form 2 & Fee Schedule">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/40 p-5">
              <h3 className="font-bold text-[var(--color-charcoal)]">Prescribed Fee Schedule for Private Bodies</h3>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">
                In terms of the Regulations relating to the Promotion of Access to Information, 2021:
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-oxblood)]/10 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-warm-cream)] font-bold text-[var(--color-oxblood)]">
                    <tr>
                      <th className="p-3">Item / Service</th>
                      <th className="p-3">Prescribed Fee (ZAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-oxblood)]/10 text-[var(--color-charcoal)]/80">
                    <tr>
                      <td className="p-3 font-semibold">Request Fee (payable on submission, non-personal requests)</td>
                      <td className="p-3 font-bold">R140.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">Photocopy of A4-size page or part thereof</td>
                      <td className="p-3">R2.00 per page</td>
                    </tr>
                    <tr>
                      <td className="p-3">Printed copy of A4-size page held on a computer</td>
                      <td className="p-3">R2.00 per page</td>
                    </tr>
                    <tr>
                      <td className="p-3">Copy on flash drive / USB device (provided by requester)</td>
                      <td className="p-3">R40.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">Copy on compact disc (CD / DVD)</td>
                      <td className="p-3">R40.00 / R60.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">Transcription of visual images / audio records per A4 page</td>
                      <td className="p-3">R24.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">Search and preparation fee (per hour or part thereof, excluding first hour)</td>
                      <td className="p-3 font-bold">R145.00 per hour</td>
                    </tr>
                    <tr>
                      <td className="p-3">Postage / Courier delivery fee</td>
                      <td className="p-3">Actual expense incurred</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-oxblood)]/15 bg-white p-5">
              <h3 className="font-bold text-[var(--color-charcoal)]">Summary of Form 2 (Request Format)</h3>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">
                To submit a request, please download and complete Form 2 from the Information Regulator website, or provide a written submission containing:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-[var(--color-charcoal)]/80">
                <li>Full name, surname, ID/passport number, and contact details of the Requester;</li>
                <li>Details of representative / agent (if requesting on behalf of another);</li>
                <li>Detailed description of the record requested to enable identification;</li>
                <li>Form of access required (electronic copy, hard copy inspection, etc.);</li>
                <li>Identification of the right to be exercised or protected, and explanation of why the record is required;</li>
                <li>Proof of payment of the prescribed R140.00 request fee.</li>
              </ul>
            </div>
          </div>
        </PAIASection>
      </div>
    </article>
  );
}
