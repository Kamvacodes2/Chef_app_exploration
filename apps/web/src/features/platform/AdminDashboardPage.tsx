"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { getCurrentUser, type AuthenticatedUser } from "@/features/auth/api/authClient";
import { FeaturedMealsPanel } from "./FeaturedMealsPanel";
import {
  fetchAdminDashboard,
  fetchChefApplications,
  fetchChefs,
  fetchCommunicationLogs,
  fetchCustomers,
  fetchPopularMeals,
  inviteChefApplication,
  logWhatsAppPreview,
  markChefApplicationInterviewConducted,
  updateChefApplication,
  updateChefApplicationVerification,
  type AdminDashboard,
  type ChefApplication,
  type ChefApplicationVerificationInput,
  type ChefVerificationOutcome,
  type ChefVerificationStatus,
  type ChefSummary,
  type CommunicationLog,
  type PlatformUser,
  type PopularMeal,
} from "./api/platformClient";

const SECTIONS = [
  { id: "applications", label: "Chef applications pipeline" },
  { id: "communications", label: "Communication controls" },
  { id: "featured-meals", label: "Featured meals" },
  { id: "customers", label: "Customers" },
  { id: "chefs", label: "Chefs" },
  { id: "popular-meals", label: "Popular meals" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type ConfirmAction = { readonly kind: "approve" | "invite"; readonly application: ChefApplication };

const DEFAULT_SECTION: SectionId = "applications";

const HURU_PORTAL_URL = "https://portal.huru.co.za/";
const VERIFICATION_STATUSES: readonly ChefVerificationStatus[] = [
  "CONSENTED",
  "PENDING",
  "REVIEW_REQUIRED",
  "PASSED",
  "NOT_CLEARED",
  "ERROR",
  "EXPIRED",
  "CANCELLED",
];
const VERIFICATION_OUTCOMES: readonly ChefVerificationOutcome[] = ["CLEAR", "HIT", "INCONCLUSIVE"];

export function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<SectionId>(DEFAULT_SECTION);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [applications, setApplications] = useState<ChefApplication[]>([]);
  const [customers, setCustomers] = useState<PlatformUser[]>([]);
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [popularMeals, setPopularMeals] = useState<PopularMeal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const isAdmin = currentUser?.roles.includes("ADMIN") === true;

  const load = async (): Promise<void> => {
    setBusy("load");
    setError(null);
    try {
      const [
        nextDashboard,
        nextApplications,
        nextCustomers,
        nextChefs,
        nextComms,
        nextMeals,
        user,
      ] = await Promise.all([
        fetchAdminDashboard(),
        fetchChefApplications(),
        fetchCustomers(),
        fetchChefs(),
        fetchCommunicationLogs(),
        fetchPopularMeals(),
        getCurrentUser(),
      ]);
      setDashboard(nextDashboard);
      setApplications(nextApplications);
      setCustomers(nextCustomers);
      setChefs(nextChefs);
      setCommunications(nextComms);
      setPopularMeals(nextMeals);
      setCurrentUser(user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the admin dashboard.");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (name: string, action: () => Promise<void>): Promise<void> => {
    setBusy(name);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Admin action failed.");
    } finally {
      setBusy(null);
    }
  };

  const markInterview = (application: ChefApplication): void => {
    void run("interview-" + application.id, async () => {
      const updated = await markChefApplicationInterviewConducted(application.id);
      setApplications((current) => replaceApplication(current, updated));
      setNotice(`${application.fullName}'s interview has been marked conducted.`);
    });
  };

  const recordVerification = (
    application: ChefApplication,
    input: ChefApplicationVerificationInput,
  ): void => {
    if (!isAdmin || !application.verification) return;
    void run("verification-" + application.id, async () => {
      const updated = await updateChefApplicationVerification(application.id, input);
      setApplications((current) => replaceApplication(current, updated));
      setNotice(`${application.fullName}'s HURU verification summary was recorded.`);
    });
  };

  const performApprove = (application: ChefApplication): void => {
    void run("approve-" + application.id, async () => {
      const updated = await updateChefApplication(application.id, { status: "APPROVED" });
      setApplications((current) => replaceApplication(current, updated));
      setNotice(`${application.fullName}'s application has been approved.`);
    });
  };

  const requestApprove = (application: ChefApplication): void => {
    if (
      application.status !== "INTERVIEW_CONDUCTED" ||
      !hasCurrentPassedVerification(application)
    ) {
      return;
    }
    setConfirm({ kind: "approve", application });
  };

  const performInvite = (application: ChefApplication): void => {
    void run("invite-" + application.id, async () => {
      const result = await inviteChefApplication(application.id);
      setApplications((current) => replaceApplication(current, result.application));
      setNotice(`Chef portal invite queued for ${application.fullName}.`);
      await load();
    });
  };

  const requestInvite = (application: ChefApplication): void => {
    if (!hasCurrentPassedVerification(application)) return;
    if (application.status !== "APPROVED") return;
    setConfirm({ kind: "invite", application });
  };

  const confirmAction = (): void => {
    if (!confirm) return;
    const action = confirm;
    setConfirm(null);
    if (action.kind === "approve") performApprove(action.application);
    else performInvite(action.application);
  };

  const previewWhatsApp = (): void => {
    void run("whatsapp", async () => {
      const log = await logWhatsAppPreview({
        recipient: "+27000000000",
        templateKey: "admin.whatsapp-preview",
        bodyPreview: "Preview message: your ChefMate booking update is ready.",
      });
      setCommunications((current) => [log, ...current]);
      setNotice(`WhatsApp preview logged as ${log.status}.`);
    });
  };

  return (
    <main className="bg-[var(--color-warm-cream)] px-4 py-10 text-[var(--color-charcoal)] sm:px-6">
      <section className="mx-auto max-w-[1280px]">
        <div className="rounded-3xl bg-[var(--color-oxblood)] p-8 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
            Admin dashboard
          </p>
          <h1 className="mt-3 text-4xl font-black">ChefMate operating room.</h1>
          <p className="mt-3 max-w-3xl text-white/75">
            See customers, chefs, applications, revenue, payouts, communication logs, and ordering
            data that can drive retention campaigns.
          </p>
        </div>

        {busy === "load" ? <Status tone="neutral">Loading admin dashboard...</Status> : null}
        {notice ? <Status tone="success">{notice}</Status> : null}
        {error ? <Status tone="error">{error}</Status> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Customers" value={dashboard?.customersCount ?? 0} />
          <Metric label="Chefs" value={dashboard?.chefsCount ?? 0} />
          <Metric label="Applications" value={dashboard?.chefApplicationsCount ?? 0} />
          <Metric label="Bookings this month" value={dashboard?.bookingsThisMonthCount ?? 0} />
          <Metric
            label="Collected this month"
            value={formatZar(dashboard?.collectedThisMonthCents ?? 0)}
          />
          <Metric label="Chef payable" value={formatZar(dashboard?.chefPayableCents ?? 0)} />
          <Metric
            label="Platform revenue"
            value={formatZar(dashboard?.platformRevenueCents ?? 0)}
          />
          <Metric
            label="Comms queued/sent"
            value={`${dashboard?.communicationsQueuedCount ?? 0}/${dashboard?.communicationsSentCount ?? 0}`}
          />
        </div>

        <SectionTabs active={activeSection} onSelect={setActiveSection} />

        <div
          aria-labelledby={tabDomId(activeSection)}
          className="mt-6"
          id={panelDomId(activeSection)}
          role="tabpanel"
          tabIndex={-1}
        >
          {activeSection === "applications" ? (
            <Panel title="Chef applications pipeline">
              {applications.map((application) => (
                <article
                  className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
                  key={application.id}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-black">{application.fullName}</h3>
                      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                        {application.email} · applied {formatDateTime(application.appliedAt)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                        Status: {application.status.replaceAll("_", " ")}
                        {application.interviewScheduledAt
                          ? ` · interview set ${formatDateTime(application.interviewScheduledAt)}`
                          : ""}
                        {application.interviewConductedAt
                          ? ` · conducted ${formatDateTime(application.interviewConductedAt)}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/70">
                        {verificationGateMessage(application)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        kind="secondary"
                        disabled={busy === "interview-" + application.id}
                        onClick={() => markInterview(application)}
                      >
                        Mark interviewed
                      </Button>
                      <Button
                        disabled={
                          application.status !== "INTERVIEW_CONDUCTED" ||
                          !hasCurrentPassedVerification(application) ||
                          busy === "approve-" + application.id
                        }
                        title={approvalDisabledReason(application) || undefined}
                        kind="secondary"
                        onClick={() => requestApprove(application)}
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={
                          application.status !== "APPROVED" ||
                          !hasCurrentPassedVerification(application) ||
                          busy === "invite-" + application.id
                        }
                        title={inviteDisabledReason(application) || undefined}
                        onClick={() => requestInvite(application)}
                      >
                        Send portal access
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm">
                    <p className="font-black text-[var(--color-charcoal)]">
                      HURU verification: {formatVerificationStatus(application)}
                    </p>
                    {application.verification ? (
                      <>
                        <p className="mt-1 text-[var(--color-charcoal)]/70">
                          Provider reference:{" "}
                          {application.verification.providerReference || "Not recorded"}
                          {application.verification.providerOutcome
                            ? ` · outcome ${application.verification.providerOutcome.replaceAll("_", " ")}`
                            : ""}
                        </p>
                        {application.verification.expiresAt ? (
                          <p className="mt-1 text-[var(--color-charcoal)]/70">
                            Expires {formatDateTime(application.verification.expiresAt)}
                          </p>
                        ) : null}
                        {isAdmin ? (
                          <a
                            className="mt-2 inline-block font-bold text-[var(--color-oxblood)] underline"
                            href={HURU_PORTAL_URL}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Open HURU portal (opens in new tab)
                          </a>
                        ) : (
                          <p className="mt-2 font-semibold text-[var(--color-charcoal)]/70">
                            Verification details are read-only for your account.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-950">
                        HURU workflow unavailable: no background-check consent is recorded for this
                        application. Do not open HURU or request a check.
                      </p>
                    )}
                  </div>
                  {application.verification && isAdmin ? (
                    <VerificationControls
                      application={application}
                      busy={busy === "verification-" + application.id}
                      onSave={(input) => recordVerification(application, input)}
                    />
                  ) : null}
                </article>
              ))}
            </Panel>
          ) : null}

          {activeSection === "communications" ? (
            <Panel title="Communication controls">
              <p className="mt-3 text-sm text-[var(--color-charcoal)]/70">
                Email sends are logged through Resend-backed outbox events. WhatsApp is scaffolded
                now and records SKIPPED until the business number/provider credentials are
                configured.
              </p>
              <Button disabled={busy === "whatsapp"} onClick={previewWhatsApp}>
                Log WhatsApp preview
              </Button>
              <div className="mt-5 grid gap-3">
                {communications.map((log) => (
                  <article
                    className="rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm"
                    key={log.id}
                  >
                    <p className="font-black">
                      {log.channel} · {log.status}
                    </p>
                    <p className="text-[var(--color-charcoal)]/70">
                      {log.templateKey} → {log.recipient}
                    </p>
                    {log.bodyPreview ? (
                      <p className="mt-1 text-[var(--color-charcoal)]/70">{log.bodyPreview}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </Panel>
          ) : null}

          {activeSection === "featured-meals" ? <FeaturedMealsPanel /> : null}

          {activeSection === "customers" ? (
            <Panel title="Customers">
              {customers.map((customer) => (
                <Person key={customer.id} person={customer} />
              ))}
            </Panel>
          ) : null}

          {activeSection === "chefs" ? (
            <Panel title="Chefs">
              {chefs.map((chef) => (
                <Person
                  detail={
                    chef.bankAccount
                      ? `Bank account ending ${chef.bankAccount.accountNumberLast4}`
                      : "Bank details pending"
                  }
                  key={chef.id}
                  person={chef}
                />
              ))}
            </Panel>
          ) : null}

          {activeSection === "popular-meals" ? (
            <Panel title="Popular meals">
              {popularMeals.map((meal) => (
                <article
                  className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm"
                  key={meal.slug}
                >
                  <p className="font-black">{meal.name}</p>
                  <p className="text-[var(--color-charcoal)]/70">
                    {meal.orderCount} orders · {formatZar(meal.grossCents)} collected
                  </p>
                </article>
              ))}
            </Panel>
          ) : null}
        </div>
      </section>

      {confirm ? (
        <ConfirmDialog
          action={confirm}
          busy={
            busy ===
            (confirm.kind === "approve"
              ? "approve-" + confirm.application.id
              : "invite-" + confirm.application.id)
          }
          onCancel={() => setConfirm(null)}
          onConfirm={confirmAction}
        />
      ) : null}
    </main>
  );
}

function ConfirmDialog({
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  readonly action: ConfirmAction;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const isApprove = action.kind === "approve";
  const app = action.application;
  const title = isApprove ? "Approve this application?" : "Send portal access?";
  const description = isApprove
    ? `You are about to approve ${app.fullName}'s chef application (${app.email}). This changes the application status to APPROVED and is required before portal access can be sent.`
    : `You are about to send a chef portal invitation to ${app.fullName} (${app.email}). A magic-link email will be queued for delivery.`;
  const confirmLabel = isApprove ? "Approve application" : "Send portal access";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.2)]">
        <h3 className="text-lg font-black text-[var(--color-oxblood)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "Processing..." : isApprove ? "Approve application" : "Confirm and send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function tabDomId(section: SectionId): string {
  return `admin-tab-${section}`;
}
function panelDomId(section: SectionId): string {
  return `admin-panel-${section}`;
}

function SectionTabs({
  active,
  onSelect,
}: {
  readonly active: SectionId;
  readonly onSelect: (section: SectionId) => void;
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusSection = (section: SectionId): void => {
    onSelect(section);
    tabRefs.current[section]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = SECTIONS.findIndex((section) => section.id === active);
    if (index < 0) return;
    const target = sectionIndexForKey(event.key, index);
    if (target === null) return;
    event.preventDefault();
    const next = SECTIONS[target];
    if (next) focusSection(next.id);
  };

  return (
    <div
      aria-label="Admin dashboard sections"
      className="mt-8 flex flex-wrap gap-2 rounded-3xl bg-white p-2 shadow-[0_20px_60px_rgba(70,33,24,0.08)]"
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            aria-controls={panelDomId(section.id)}
            aria-selected={isActive}
            className={sectionTabClassName(isActive)}
            id={tabDomId(section.id)}
            key={section.id}
            onClick={() => onSelect(section.id)}
            ref={(node) => {
              tabRefs.current[section.id] = node;
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

function sectionIndexForKey(key: string, index: number): number | null {
  const last = SECTIONS.length - 1;
  switch (key) {
    case "ArrowRight":
      return (index + 1) % SECTIONS.length;
    case "ArrowLeft":
      return (index - 1 + SECTIONS.length) % SECTIONS.length;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

function sectionTabClassName(isActive: boolean): string {
  return [
    "min-h-10 rounded-xl px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)]",
    isActive
      ? "bg-[var(--color-oxblood)] text-white"
      : "text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)]",
  ].join(" ");
}

function Metric({ label, value }: { readonly label: string; readonly value: number | string }) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-charcoal)]/50">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-[var(--color-oxblood)]">{value}</p>
    </article>
  );
}

function Panel({ children, title }: { readonly children: ReactNode; readonly title: string }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">{title}</h2>
      {children}
    </section>
  );
}

function Person({ detail, person }: { readonly detail?: string; readonly person: PlatformUser }) {
  return (
    <article className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm">
      <p className="font-black">{person.displayName}</p>
      <p className="text-[var(--color-charcoal)]/70">{person.email}</p>
      {detail ? <p className="text-[var(--color-charcoal)]/70">{detail}</p> : null}
    </article>
  );
}

function Button({
  children,
  disabled = false,
  kind = "primary",
  onClick,
  title,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly kind?: "primary" | "secondary";
  readonly onClick: () => void;
  readonly title?: string;
}) {
  const className =
    kind === "primary"
      ? "bg-[var(--color-oxblood)] text-white"
      : "border border-[var(--color-oxblood)]/20 text-[var(--color-oxblood)]";
  return (
    <button
      className={`mt-3 min-h-10 rounded-xl px-4 text-sm font-bold disabled:opacity-50 ${className}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function Status({
  children,
  tone,
}: {
  readonly children: string;
  readonly tone: "neutral" | "success" | "error";
}) {
  const className = {
    neutral: "bg-white text-[var(--color-charcoal)]/75",
    success: "bg-emerald-50 text-emerald-900",
    error: "bg-red-50 text-red-900",
  }[tone];
  return (
    <p
      className={`mt-5 rounded-2xl p-4 text-sm font-semibold ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

function VerificationControls({
  application,
  busy,
  onSave,
}: {
  readonly application: ChefApplication;
  readonly busy: boolean;
  readonly onSave: (input: ChefApplicationVerificationInput) => void;
}) {
  const [status, setStatus] = useState<ChefVerificationStatus>(
    application.verification?.status ?? "PENDING",
  );
  const [providerReference, setProviderReference] = useState(
    application.verification?.providerReference ?? "",
  );
  const [providerOutcome, setProviderOutcome] = useState<ChefVerificationOutcome | "">(
    application.verification?.providerOutcome ?? "",
  );
  const [expiresAt, setExpiresAt] = useState(
    application.verification?.expiresAt?.slice(0, 10) ?? "",
  );

  useEffect(() => {
    setStatus(application.verification?.status ?? "PENDING");
    setProviderReference(application.verification?.providerReference ?? "");
    setProviderOutcome(application.verification?.providerOutcome ?? "");
    setExpiresAt(application.verification?.expiresAt?.slice(0, 10) ?? "");
  }, [
    application.verification?.expiresAt,
    application.verification?.providerOutcome,
    application.verification?.providerReference,
    application.verification?.status,
  ]);

  const passedOutcomeIsValid = providerOutcome === "CLEAR" || providerOutcome === "HIT";
  const canSavePassed = providerReference.trim().length > 0 && passedOutcomeIsValid;
  const canSave = status !== "PASSED" || canSavePassed;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      status,
      providerReference: providerReference.trim() || null,
      providerOutcome: providerOutcome || null,
      expiresAt: expiresAt ? `${expiresAt}T23:59:59.999Z` : null,
    });
  };

  const requirementsId = `verification-requirements-${application.id}`;

  return (
    <form
      className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-4"
      onSubmit={submit}
    >
      <h4 className="font-black text-[var(--color-charcoal)]">Record HURU portal result</h4>
      <p className="mt-1 text-xs text-[var(--color-charcoal)]/65">
        Record only the minimal portal summary. Do not enter report text, offence details, identity
        copies, or PDF content. HIT and INCONCLUSIVE require human review and never reject an
        applicant automatically; provider errors are neutral.
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/70" id={requirementsId}>
        PASSED requires a provider reference and a CLEAR or HIT outcome. Leave an optional field
        blank to clear its stored value.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[var(--color-charcoal)]/70">
          Status
          <select
            className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 bg-white px-3 text-sm text-[var(--color-charcoal)]"
            onChange={(event) => setStatus(event.target.value as ChefVerificationStatus)}
            value={status}
          >
            {VERIFICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[var(--color-charcoal)]/70">
          Provider reference
          <input
            aria-describedby={requirementsId}
            className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-3 text-sm"
            onChange={(event) => setProviderReference(event.target.value)}
            placeholder="HURU reference"
            required={status === "PASSED"}
            type="text"
            value={providerReference}
          />
        </label>
        <label className="text-xs font-bold text-[var(--color-charcoal)]/70">
          Provider outcome
          <select
            aria-describedby={requirementsId}
            className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 bg-white px-3 text-sm text-[var(--color-charcoal)]"
            onChange={(event) =>
              setProviderOutcome(event.target.value as ChefVerificationOutcome | "")
            }
            required={status === "PASSED"}
            value={providerOutcome}
          >
            <option value="">Not supplied</option>
            {VERIFICATION_OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[var(--color-charcoal)]/70">
          Expiry date (optional)
          <input
            className="mt-1 min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 px-3 text-sm"
            onChange={(event) => setExpiresAt(event.target.value)}
            type="date"
            value={expiresAt}
          />
        </label>
      </div>
      <button
        className="mt-3 min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
        disabled={busy || !canSave}
        type="submit"
      >
        {busy ? "Saving HURU result..." : "Save HURU result"}
      </button>
    </form>
  );
}

function hasCurrentPassedVerification(application: ChefApplication): boolean {
  const verification = application.verification;
  if (verification?.status !== "PASSED") return false;
  if (!verification.providerReference?.trim()) return false;
  if (verification.providerOutcome !== "CLEAR" && verification.providerOutcome !== "HIT") {
    return false;
  }
  if (!verification.expiresAt) return true;
  const expiresAt = Date.parse(verification.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function formatVerificationStatus(application: ChefApplication): string {
  if (!application.verification) return "Not recorded";
  return `${application.verification.provider} · ${application.verification.status.replaceAll("_", " ")}`;
}

function verificationGateMessage(application: ChefApplication): string {
  if (hasCurrentPassedVerification(application)) {
    return "Current PASSED HURU verification recorded. Human approval remains required.";
  }
  if (application.verification?.status === "PASSED") {
    if (
      !application.verification.providerReference?.trim() ||
      (application.verification.providerOutcome !== "CLEAR" &&
        application.verification.providerOutcome !== "HIT")
    ) {
      return "Approval and portal access are blocked because the PASSED HURU verification is missing its provider reference or CLEAR/HIT outcome.";
    }
    return "Approval and portal access are blocked because the PASSED HURU verification has expired.";
  }
  return `Approval and portal access require a current PASSED HURU verification; current status is ${
    application.verification?.status.replaceAll("_", " ") ?? "not recorded"
  }.`;
}

function approvalDisabledReason(application: ChefApplication): string | null {
  if (application.status !== "INTERVIEW_CONDUCTED") {
    return "Mark the interview conducted before approval.";
  }
  return hasCurrentPassedVerification(application) ? null : verificationGateMessage(application);
}

function inviteDisabledReason(application: ChefApplication): string | null {
  if (application.status !== "APPROVED") {
    return "Approve the application before sending portal access.";
  }
  return hasCurrentPassedVerification(application) ? null : verificationGateMessage(application);
}

function replaceApplication(
  applications: ChefApplication[],
  updated: ChefApplication,
): ChefApplication[] {
  return applications.map((application) => (application.id === updated.id ? updated : application));
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
