"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchChefApplications,
  inviteChefApplication,
  markChefApplicationInterviewConducted,
  updateChefApplication,
  type ChefApplication,
} from "@/features/platform/api/platformClient";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminApplications() {
  const [applications, setApplications] = useState<ChefApplication[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy("load");
    setError(null);
    try {
      const data = await fetchChefApplications();
      setApplications(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Load failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const markInterview = (app: ChefApplication) => {
    void run(`interview-${app.id}`, async () => {
      const updated = await markChefApplicationInterviewConducted(app.id);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setNotice(`${app.fullName}'s interview marked conducted.`);
    });
  };

  const approve = (app: ChefApplication) => {
    void run(`approve-${app.id}`, async () => {
      const updated = await updateChefApplication(app.id, {
        status: "APPROVED",
      });
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setNotice(`${app.fullName}'s application approved.`);
    });
  };

  const invite = (app: ChefApplication) => {
    if (app.status !== "APPROVED") return;
    void run(`invite-${app.id}`, async () => {
      const result = await inviteChefApplication(app.id);
      setApplications((prev) =>
        prev.map((a) => (a.id === result.application.id ? result.application : a)),
      );
      setNotice(`Portal invite sent to ${app.fullName}.`);
      await load();
    });
  };

  if (busy === "load") {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        Loading applications...
      </p>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">
        Chef Applications Pipeline
      </h2>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
        {applications.length} application
        {applications.length !== 1 ? "s" : ""}
      </p>

      {notice ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</p>
      ) : null}

      {applications.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
          No applications yet.
        </p>
      ) : (
        applications.map((app) => (
          <article
            key={app.id}
            className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-black">{app.fullName}</h3>
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                  {app.email} · applied {formatDateTime(app.appliedAt)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-[var(--color-charcoal)]/70">
                  Status: <StatusBadge status={app.status} />
                  {app.interviewScheduledAt
                    ? ` · interview set ${formatDateTime(app.interviewScheduledAt)}`
                    : ""}
                  {app.interviewConductedAt
                    ? ` · conducted ${formatDateTime(app.interviewConductedAt)}`
                    : ""}
                </p>
                {app.city ? (
                  <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">
                    {app.city} · {app.serviceAreas.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
                  disabled={busy === `interview-${app.id}`}
                  onClick={() => markInterview(app)}
                  type="button"
                >
                  Mark Interviewed
                </button>
                <button
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:opacity-50"
                  disabled={app.status !== "INTERVIEW_CONDUCTED" || busy === `approve-${app.id}`}
                  onClick={() => approve(app)}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
                  disabled={app.status !== "APPROVED" || busy === `invite-${app.id}`}
                  onClick={() => invite(app)}
                  type="button"
                >
                  Send Portal Access
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
