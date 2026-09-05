"use client";

import { useState } from "react";
import {
  availabilityFromRecord,
  claimAvailableSession,
  type AvailableSession,
  type ChefProfile,
} from "./api/platformClient";
import { AvailabilityConfirmModal, sessionFallsOutside } from "./AvailabilityConfirmModal";

interface AvailableSessionsPanelProps {
  readonly sessions: readonly AvailableSession[];
  readonly profile: ChefProfile | null;
  readonly busyKey: string | null;
  readonly onClaimed: (reference: string, payoutCents: number) => void;
  readonly run: (name: string, action: () => Promise<void>) => void;
}

export function AvailableSessionsPanel({
  sessions,
  profile,
  busyKey,
  onClaimed,
  run,
}: AvailableSessionsPanelProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const availability = availabilityFromRecord(profile?.availability);
  const pendingSession = sessions.find((session) => session.id === pendingId) ?? null;
  const busy = busyKey === "claim-session";

  const confirm = (): void => {
    if (!pendingSession) return;
    const session = pendingSession;
    run("claim-session", async () => {
      const result = await claimAvailableSession(session.id);
      setPendingId(null);
      onClaimed(result.booking.reference, result.booking.chefPayoutCents ?? 0);
    });
  };

  return (
    <>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">
        Every session currently open for matching, first come first served. Claim one and it&apos;s
        yours immediately.
      </p>

      {sessions.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
          No sessions are up for grabs right now. You&apos;ll also still receive personal offers
          when a booking matches your profile.
        </p>
      ) : null}

      {sessions.map((session) => (
        <article
          className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
          key={session.id}
        >
          <h3 className="text-xl font-black">{session.mainName}</h3>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            {session.reference} · {formatDate(session.scheduledDate)} at {session.timeSlot}
            {session.serviceArea ? ` · ${session.serviceArea}` : ""}
          </p>
          {session.chefPayoutCents != null ? (
            <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
              You receive {formatZar(session.chefPayoutCents)}
            </p>
          ) : null}
          <div className="mt-4">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => setPendingId(session.id)}
              type="button"
            >
              Claim this session
            </button>
          </div>
        </article>
      ))}

      {pendingSession ? (
        <AvailabilityConfirmModal
          busy={busy}
          onCancel={() => setPendingId(null)}
          onConfirm={confirm}
          session={{
            reference: pendingSession.reference,
            mainName: pendingSession.mainName,
            scheduledDate: formatDate(pendingSession.scheduledDate),
            timeSlot: pendingSession.timeSlot,
            chefPayoutCents: pendingSession.chefPayoutCents ?? 0,
            outsideAvailability: sessionFallsOutside(
              pendingSession.scheduledDate,
              pendingSession.timeSlot,
              availability,
            ),
          }}
        />
      ) : null}
    </>
  );
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}
