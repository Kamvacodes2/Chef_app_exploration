"use client";

import { type ReactNode, useEffect, useState } from "react";
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
  type AdminDashboard,
  type ChefApplication,
  type ChefSummary,
  type CommunicationLog,
  type PlatformUser,
  type PopularMeal,
} from "./api/platformClient";

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [applications, setApplications] = useState<ChefApplication[]>([]);
  const [customers, setCustomers] = useState<PlatformUser[]>([]);
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [popularMeals, setPopularMeals] = useState<PopularMeal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setBusy("load");
    setError(null);
    try {
      const [nextDashboard, nextApplications, nextCustomers, nextChefs, nextComms, nextMeals] =
        await Promise.all([
          fetchAdminDashboard(),
          fetchChefApplications(),
          fetchCustomers(),
          fetchChefs(),
          fetchCommunicationLogs(),
          fetchPopularMeals(),
        ]);
      setDashboard(nextDashboard);
      setApplications(nextApplications);
      setCustomers(nextCustomers);
      setChefs(nextChefs);
      setCommunications(nextComms);
      setPopularMeals(nextMeals);
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

  const approve = (application: ChefApplication): void => {
    void run("approve-" + application.id, async () => {
      const updated = await updateChefApplication(application.id, { status: "APPROVED" });
      setApplications((current) => replaceApplication(current, updated));
      setNotice(`${application.fullName}'s application has been approved.`);
    });
  };

  const invite = (application: ChefApplication): void => {
    if (application.status !== "APPROVED") return;
    void run("invite-" + application.id, async () => {
      const result = await inviteChefApplication(application.id);
      setApplications((current) => replaceApplication(current, result.application));
      setNotice(`Chef portal invite queued for ${application.fullName}.`);
      await load();
    });
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                        busy === "approve-" + application.id
                      }
                      kind="secondary"
                      onClick={() => approve(application)}
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={
                        application.status !== "APPROVED" || busy === "invite-" + application.id
                      }
                      onClick={() => invite(application)}
                    >
                      Send portal access
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </Panel>

          <Panel title="Communication controls">
            <p className="mt-3 text-sm text-[var(--color-charcoal)]/70">
              Email sends are logged through Resend-backed outbox events. WhatsApp is scaffolded now
              and records SKIPPED until the business number/provider credentials are configured.
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
        </div>

        <div className="mt-6">
          <FeaturedMealsPanel />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Panel title="Customers">
            {customers.map((customer) => (
              <Person key={customer.id} person={customer} />
            ))}
          </Panel>
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
        </div>
      </section>
    </main>
  );
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
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly kind?: "primary" | "secondary";
  readonly onClick: () => void;
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
