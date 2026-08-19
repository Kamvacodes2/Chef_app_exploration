"use client";

import { type FormEvent, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentUser, type AuthenticatedUser } from "@/features/auth/api/authClient";
import {
  fetchChefApplications,
  inviteChefApplication,
  markChefApplicationInterviewConducted,
  updateChefApplication,
  updateChefApplicationVerification,
  type ChefApplication,
  type ChefApplicationVerificationInput,
  type ChefVerificationOutcome,
  type ChefVerificationStatus,
} from "@/features/platform/api/platformClient";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

export function AdminApplications() {
  const [applications, setApplications] = useState<ChefApplication[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const isAdmin = currentUser?.roles.includes("ADMIN") === true;

  const load = async () => {
    setBusy("load");
    setError(null);
    try {
      const [data, user] = await Promise.all([fetchChefApplications(), getCurrentUser()]);
      setApplications(data);
      setCurrentUser(user);
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

  const recordVerification = (app: ChefApplication, input: ChefApplicationVerificationInput) => {
    if (!isAdmin || !app.verification) return;
    void run(`verification-${app.id}`, async () => {
      const updated = await updateChefApplicationVerification(app.id, input);
      setApplications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`${app.fullName}'s HURU verification summary was recorded.`);
    });
  };

  const approve = (app: ChefApplication) => {
    if (app.status !== "INTERVIEW_CONDUCTED" || !hasCurrentPassedVerification(app)) return;
    void run(`approve-${app.id}`, async () => {
      const updated = await updateChefApplication(app.id, {
        status: "APPROVED",
      });
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setNotice(`${app.fullName}'s application approved.`);
    });
  };

  const invite = (app: ChefApplication) => {
    if (!hasCurrentPassedVerification(app)) return;
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
        <p
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900"
          role="alert"
        >
          {error}
        </p>
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
              <p className="text-sm font-semibold text-[var(--color-charcoal)]/70">
                {verificationGateMessage(app)}
              </p>
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
                  disabled={
                    app.status !== "INTERVIEW_CONDUCTED" ||
                    !hasCurrentPassedVerification(app) ||
                    busy === `approve-${app.id}`
                  }
                  title={approvalDisabledReason(app) || undefined}
                  onClick={() => approve(app)}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="min-h-10 rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:opacity-50"
                  disabled={
                    app.status !== "APPROVED" ||
                    !hasCurrentPassedVerification(app) ||
                    busy === `invite-${app.id}`
                  }
                  title={inviteDisabledReason(app) || undefined}
                  onClick={() => invite(app)}
                  type="button"
                >
                  Send Portal Access
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm">
              <p className="font-black text-[var(--color-charcoal)]">
                HURU verification: {formatVerificationStatus(app)}
              </p>
              {app.verification ? (
                <>
                  <p className="mt-1 text-[var(--color-charcoal)]/70">
                    Provider reference: {app.verification.providerReference || "Not recorded"}
                    {app.verification.providerOutcome
                      ? ` · outcome ${app.verification.providerOutcome.replaceAll("_", " ")}`
                      : ""}
                  </p>
                  {app.verification.expiresAt ? (
                    <p className="mt-1 text-[var(--color-charcoal)]/70">
                      Expires {formatDateTime(app.verification.expiresAt)}
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
            {app.verification && isAdmin ? (
              <VerificationControls
                app={app}
                busy={busy === `verification-${app.id}`}
                onSave={(input) => recordVerification(app, input)}
              />
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}

function VerificationControls({
  app,
  busy,
  onSave,
}: {
  readonly app: ChefApplication;
  readonly busy: boolean;
  readonly onSave: (input: ChefApplicationVerificationInput) => void;
}) {
  const [status, setStatus] = useState<ChefVerificationStatus>(
    app.verification?.status ?? "PENDING",
  );
  const [providerReference, setProviderReference] = useState(
    app.verification?.providerReference ?? "",
  );
  const [providerOutcome, setProviderOutcome] = useState<ChefVerificationOutcome | "">(
    app.verification?.providerOutcome ?? "",
  );
  const [expiresAt, setExpiresAt] = useState(app.verification?.expiresAt?.slice(0, 10) ?? "");

  useEffect(() => {
    setStatus(app.verification?.status ?? "PENDING");
    setProviderReference(app.verification?.providerReference ?? "");
    setProviderOutcome(app.verification?.providerOutcome ?? "");
    setExpiresAt(app.verification?.expiresAt?.slice(0, 10) ?? "");
  }, [
    app.verification?.expiresAt,
    app.verification?.providerOutcome,
    app.verification?.providerReference,
    app.verification?.status,
  ]);

  const passedOutcomeIsValid = providerOutcome === "CLEAR" || providerOutcome === "HIT";
  const canSavePassed = providerReference.trim().length > 0 && passedOutcomeIsValid;
  const canSave = status !== "PASSED" || canSavePassed;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      status,
      providerReference: providerReference.trim() || null,
      providerOutcome: providerOutcome || null,
      expiresAt: expiresAt ? `${expiresAt}T23:59:59.999Z` : null,
    });
  };

  const requirementsId = `verification-requirements-${app.id}`;

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

function hasCurrentPassedVerification(app: ChefApplication): boolean {
  const verification = app.verification;
  if (verification?.status !== "PASSED") return false;
  if (!verification.providerReference?.trim()) return false;
  if (verification.providerOutcome !== "CLEAR" && verification.providerOutcome !== "HIT") {
    return false;
  }
  if (!verification.expiresAt) return true;
  const expiresAt = Date.parse(verification.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function formatVerificationStatus(app: ChefApplication): string {
  if (!app.verification) return "Not recorded";
  return `${app.verification.provider} · ${app.verification.status.replaceAll("_", " ")}`;
}

function verificationGateMessage(app: ChefApplication): string {
  if (hasCurrentPassedVerification(app)) {
    return "Current PASSED HURU verification recorded. Human approval remains required.";
  }
  if (app.verification?.status === "PASSED") {
    if (
      !app.verification.providerReference?.trim() ||
      (app.verification.providerOutcome !== "CLEAR" && app.verification.providerOutcome !== "HIT")
    ) {
      return "Approval and portal access are blocked because the PASSED HURU verification is missing its provider reference or CLEAR/HIT outcome.";
    }
    return "Approval and portal access are blocked because the PASSED HURU verification has expired.";
  }
  return `Approval and portal access require a current PASSED HURU verification; current status is ${
    app.verification?.status.replaceAll("_", " ") ?? "not recorded"
  }.`;
}

function approvalDisabledReason(app: ChefApplication): string | null {
  if (app.status !== "INTERVIEW_CONDUCTED") return "Mark the interview conducted before approval.";
  return hasCurrentPassedVerification(app) ? null : verificationGateMessage(app);
}

function inviteDisabledReason(app: ChefApplication): string | null {
  if (app.status !== "APPROVED") return "Approve the application before sending portal access.";
  return hasCurrentPassedVerification(app) ? null : verificationGateMessage(app);
}
