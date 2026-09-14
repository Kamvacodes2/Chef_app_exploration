import type { ReactNode } from "react";
import Link from "next/link";

const contents = [
  ["purpose-scope", "Purpose, Objectives, and Scope"],
  ["complaint-categories", "Categorisation of Complaints"],
  ["submission-process", "How to Submit a Complaint"],
  ["intake-timeframes", "Intake, Prioritisation, and Acknowledgement Timeframes"],
  ["evidence-participation", "Evidence Gathering and Fair Participation"],
  ["investigation-procedure", "Investigation and Assessment Procedure"],
  ["remedies-outcomes", "Available Remedies and Platform Outcomes"],
  ["escalation-referral", "Escalation and Information Officer Referral"],
  ["internal-appeal", "Internal Review and Appeal Mechanism"],
  ["confidentiality-popia", "Confidentiality, POPIA Compliance, and Record Retention"],
  ["external-dispute-rights", "External Dispute Resolution and Statutory Rights"],
] as const;

interface SectionProps {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly children: ReactNode;
}

function ComplaintsSection({ id, number, title, children }: SectionProps) {
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

export default function ComplaintsHandlingPage() {
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
            Binding Operational Policy
          </p>
          <span className="rounded-full bg-[var(--color-oxblood)]/10 px-3 py-1 text-xs font-bold text-[var(--color-oxblood)]">
            Effective Date: 13 September 2026
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-black text-[var(--color-oxblood)] sm:text-4xl">
          Complaints Handling Process
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/80">
          Chef Mate is committed to fair, transparent, and prompt resolution of all issues,
          disputes, safety incidents, and feedback arising across our culinary marketplace. This
          policy sets out our standardized complaints handling procedures for Customers and Chefs.
        </p>
      </header>

      <nav
        aria-label="Complaints handling contents"
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
        <ComplaintsSection id="purpose-scope" number={1} title="Purpose, Objectives, and Scope">
          <Clause number="1.1">
            <p>
              This Complaints Handling Process sets out the binding rules and procedures for
              investigating, assessing, and resolving grievances arising from the use of the CM
              Platform (
              <Link className="underline" href="https://chefmate.co.za">
                https://chefmate.co.za
              </Link>
              ).
            </p>
          </Clause>
          <Clause number="1.2">
            <p>
              This policy applies to both <strong>Customers</strong> and <strong>Chefs</strong> in
              respect of booking execution, culinary performance, interpersonal conduct, billing
              disputes, food safety, property damage, ratings &amp; reviews, and privacy compliance.
            </p>
          </Clause>
          <Clause number="1.3">
            <p>
              Chef Mate facilitates and administers this dispute resolution process as an impartial
              marketplace operator. Chef Mate does not operate as a court of law or statutory
              arbitrator.
            </p>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="complaint-categories"
          number={2}
          title="Categorisation of Complaints"
        >
          <Clause number="2.1">
            <p>
              To ensure appropriate prioritization and investigative rigor, complaints are
              classified into three core tiers:
            </p>
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
                <p className="font-bold text-red-950">
                  Tier 1: Urgent Safety, Health &amp; Regulatory Incidents
                </p>
                <p className="mt-1 text-xs text-red-900">
                  Suspected foodborne illness, severe allergic reactions, physical threats or
                  harassment, criminal conduct, major property damage, or data security compromises.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="font-bold text-amber-950">
                  Tier 2: Financial, Billing &amp; Booking Disputes
                </p>
                <p className="mt-1 text-xs text-amber-900">
                  Late cancellations, no-shows, payment gateway errors, refund calculations, chef
                  payout adjustments, or subscription billing issues.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 p-4">
                <p className="font-bold text-[var(--color-charcoal)]">
                  Tier 3: Service-Level &amp; Culinary Quality Concerns
                </p>
                <p className="mt-1 text-xs text-[var(--color-charcoal)]/80">
                  Menu deviations, culinary execution standards, punctuality, kitchen cleanup
                  quality, communication delays, or contested review content.
                </p>
              </div>
            </div>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection id="submission-process" number={3} title="How to Submit a Complaint">
          <Clause number="3.1">
            <p>
              Complaints must be submitted in writing through one of the following official
              channels:
            </p>
            <ol className={alphaListClass}>
              <li>
                <strong>Email:</strong> Send full details to{" "}
                <a
                  className="font-semibold text-[var(--color-oxblood)] underline"
                  href="mailto:support@chefmate.co.za"
                >
                  support@chefmate.co.za
                </a>
                ;
              </li>
              <li>
                <strong>In-App Support:</strong> Submit a ticket via the support portal on your
                active account dashboard.
              </li>
            </ol>
          </Clause>
          <Clause number="3.2">
            <p>When lodging a complaint, please include:</p>
            <ul className="list-disc space-y-1 pl-6 text-xs text-[var(--color-charcoal)]/85">
              <li>Your full name, registered email address, and phone number;</li>
              <li>The specific Booking Reference Number, date, and scheduled time;</li>
              <li>A clear, chronological summary of what occurred;</li>
              <li>
                Photographic evidence, receipts, chat screenshots, or medical notes where relevant;
              </li>
              <li>The specific remedial outcome or resolution you are requesting.</li>
            </ul>
          </Clause>
          <Clause number="3.3">
            <p className="font-semibold text-red-950">
              Emergency Reporting: For immediate personal danger, physical violence, or medical
              emergencies, contact the South African Police Service (10111) or emergency medical
              services (112 / 10177) immediately before notifying Chef Mate.
            </p>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="intake-timeframes"
          number={4}
          title="Intake, Prioritisation, and Acknowledgement Timeframes"
        >
          <Clause number="4.1">
            <p>Chef Mate adheres to strict acknowledgement and resolution target timeframes:</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-oxblood)]/15">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--color-warm-cream)] font-bold text-[var(--color-oxblood)]">
                  <tr>
                    <th className="p-3">Complaint Category</th>
                    <th className="p-3">Acknowledgement Window</th>
                    <th className="p-3">Target Resolution Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-oxblood)]/10 text-[var(--color-charcoal)]/80">
                  <tr>
                    <td className="p-3 font-semibold text-red-900">
                      Tier 1: Urgent Safety &amp; Health
                    </td>
                    <td className="p-3 font-bold text-red-700">Within 2 to 4 Hours</td>
                    <td className="p-3">Within 24 to 48 Hours</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-amber-900">
                      Tier 2: Billing &amp; Cancellations
                    </td>
                    <td className="p-3">Within 24 Hours</td>
                    <td className="p-3">Within 3 to 5 Business Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Tier 3: Service-Level &amp; Quality</td>
                    <td className="p-3">Within 24 to 48 Hours</td>
                    <td className="p-3">Within 5 to 7 Business Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="evidence-participation"
          number={5}
          title="Evidence Gathering and Fair Participation"
        >
          <Clause number="5.1">
            <p>
              In adherence to the principles of natural justice and fair process (
              <em>audi alteram partem</em>), no material adverse finding or account sanction will be
              finalized without:
            </p>
            <ol className={alphaListClass}>
              <li>giving the affected party notice of the substance of the complaint;</li>
              <li>
                providing a fair opportunity to submit their version of events and supporting
                evidence; and
              </li>
              <li>reviewing all submissions objectively before reaching a determination.</li>
            </ol>
          </Clause>
          <Clause number="5.2">
            <p>
              Chef Mate may request access to platform messages, booking notes, time-stamped photos
              of the kitchen or prepared dishes, grocery receipts, or witness statements.
            </p>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="investigation-procedure"
          number={6}
          title="Investigation and Assessment Procedure"
        >
          <Clause number="6.1">
            <p>
              A trained member of the Chef Mate Operations and Compliance Team conducts the
              investigation. The investigation evaluates:
            </p>
            <ol className={alphaListClass}>
              <li>
                compliance with the Customer Terms, Chef Agreement, Platform Rules, and Code of
                Conduct;
              </li>
              <li>
                statutory food safety standards under the Foodstuffs Act and Hygiene Regulations;
              </li>
              <li>
                credibility and consistency of photographic, transactional, and communication
                evidence;
              </li>
              <li>prior complaint or infraction history of either party.</li>
            </ol>
          </Clause>
          <Clause number="6.2">
            <p className="font-semibold text-[var(--color-charcoal)]">
              Human Review Guarantee: Every complaint determination and adverse account sanction is
              manually assessed by human compliance personnel. No automated algorithmic outcome is
              final.
            </p>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="remedies-outcomes"
          number={7}
          title="Available Remedies and Platform Outcomes"
        >
          <Clause number="7.1">
            <p>
              Depending on the findings of the investigation, Chef Mate may implement one or more of
              the following outcomes:
            </p>
            <ol className={alphaListClass}>
              <li>
                <strong>Customer Remedies:</strong> An explanation or apology, booking reschedule,
                platform credit, partial refund, or full refund of the Total Price (initiated within
                5 Business Days);
              </li>
              <li>
                <strong>Chef Adjustments:</strong> Release of held payout, adjustment of Commission,
                reimbursement of verified ingredient or travel expenses;
              </li>
              <li>
                <strong>Moderation &amp; Quality Actions:</strong> Removal or moderation of reviews
                violating the Review Policy, or requiring culinary retraining;
              </li>
              <li>
                <strong>Chef Infractions &amp; Account Sanctions:</strong> Issuing formal written
                warnings, temporary profile suspension, or permanent deactivation under the Chef
                Agreement;
              </li>
              <li>
                <strong>Customer Sanctions:</strong> Warning, booking restriction, or account
                closure for abusive conduct, non-payment, or safety violations.
              </li>
            </ol>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="escalation-referral"
          number={8}
          title="Escalation and Information Officer Referral"
        >
          <Clause number="8.1">
            <p>
              Complex, severe, or high-risk matters are immediately escalated to senior management,
              legal counsel, or specialized leads:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-xs text-[var(--color-charcoal)]/85">
              <li>
                <strong>Privacy Grievances:</strong> Any complaint concerning Personal Information,
                data leaks, or POPIA rights is referred directly to the Information Officer (Neliswa
                Ncama);
              </li>
              <li>
                <strong>Criminal Conduct:</strong> Severe safety threats, assault, or theft are
                referred to law enforcement and our insurance underwriters;
              </li>
              <li>
                <strong>Legal Action:</strong> Formal notices of demand or litigation threats are
                escalated to Chef Mate legal counsel.
              </li>
            </ul>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="internal-appeal"
          number={9}
          title="Internal Review and Appeal Mechanism"
        >
          <Clause number="9.1">
            <p>
              If a Customer or Chef is dissatisfied with a complaint determination, they may request
              an internal review within <strong>7 Business Days</strong> of receiving the outcome
              decision.
            </p>
          </Clause>
          <Clause number="9.2">
            <p>
              To appeal, email{" "}
              <a
                className="font-semibold text-[var(--color-oxblood)] underline"
                href="mailto:support@chefmate.co.za"
              >
                support@chefmate.co.za
              </a>{" "}
              with the subject line <em>&quot;Appeal: [Complaint Reference Number]&quot;</em>,
              setting out the grounds of appeal and any new or previously unavailable evidence.
            </p>
          </Clause>
          <Clause number="9.3">
            <p>
              Wherever practicable, someone not responsible for the original outcome considers the
              request and communicates whether the outcome is confirmed, changed, or returned for
              further inquiry within <strong>7 Business Days</strong>.
            </p>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="confidentiality-popia"
          number={10}
          title="Confidentiality, POPIA Compliance, and Record Retention"
        >
          <Clause number="10.1">
            <p>
              All complaint records, statements, evidence, and outcome reports are handled with
              strict confidentiality in accordance with our{" "}
              <Link className="underline" href="/legal/privacy">
                Privacy Policy
              </Link>{" "}
              and POPIA.
            </p>
          </Clause>
          <Clause number="10.2">
            <p>
              Complaint files are retained securely for a minimum period of 3 years to ensure
              compliance with consumer protection laws, dispute records, and auditing requirements.
            </p>
          </Clause>
        </ComplaintsSection>

        <ComplaintsSection
          id="external-dispute-rights"
          number={11}
          title="External Dispute Resolution and Statutory Rights"
        >
          <Clause number="11.1">
            <p>
              Participation in this Complaints Handling Process is voluntary and does not prevent or
              waive your constitutional or statutory rights to seek redress from external statutory
              bodies, including:
            </p>
            <ol className={alphaListClass}>
              <li>
                <strong>Consumer Goods and Services Ombud (CGSO):</strong> The accredited statutory
                ombud scheme for consumer disputes under the CPA (
                <a
                  className="underline"
                  href="https://cgso.org.za"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://cgso.org.za
                </a>
                );
              </li>
              <li>
                <strong>National Consumer Commission (NCC):</strong> The statutory regulator
                responsible for enforcing the Consumer Protection Act (
                <a
                  className="underline"
                  href="https://thencc.org.za"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://thencc.org.za
                </a>
                );
              </li>
              <li>
                <strong>Information Regulator (South Africa):</strong> For data protection and POPIA
                complaints (
                <a
                  className="underline"
                  href="https://inforegulator.org.za"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://inforegulator.org.za
                </a>
                );
              </li>
              <li>
                <strong>AFSA Mediation / Arbitration:</strong> The Arbitration Foundation of
                Southern Africa;
              </li>
              <li>
                <strong>Courts of Law:</strong> The Small Claims Court, Magistrates&apos; Court, or
                High Court of South Africa.
              </li>
            </ol>
          </Clause>
        </ComplaintsSection>
      </div>
    </article>
  );
}
