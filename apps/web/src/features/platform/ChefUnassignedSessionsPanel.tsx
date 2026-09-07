"use client";

import { useState } from "react";
import {
  availabilityFromRecord,
  claimAvailableSession,
  type AvailableSession,
  type ChefProfile,
} from "./api/platformClient";
import { AvailabilityConfirmModal, sessionFallsOutside } from "./AvailabilityConfirmModal";

interface ChefUnassignedSessionsPanelProps {
  readonly sessions: readonly AvailableSession[];
  readonly profile: ChefProfile | null;
  readonly busyKey: string | null;
  readonly onClaimed: (reference: string, payoutCents: number) => void;
  readonly onLoadFailed?: (message: string) => void;
}

export function ChefUnassignedSessionsPanel({
  sessions,
  profile,
  busyKey,
  onClaimed,
}: ChefUnassignedSessionsPanelProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const availability = availabilityFromRecord(profile?.availability);
  const busy = busyKey === "claim-session";

  const confirm = (): void => {
    if (!pendingId) return;
    const session = sessions.find((session) => session.id === pendingId) ?? null;
    if (!session) return;
    setPendingId(null);
    void claimAvailableSession(session.id).then((result) => {
      onClaimed(result.booking.reference, result.booking.chefPayoutCents ?? 0);
    });
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h3 className="text-xl font-black text-[var(--color-oxblood)]">Sessions up for grabs</h3>
      <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
        Open sessions you can claim first come, first served. Once you claim one, it is yours
        immediately.
      </p>

      {sessions.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
          No sessions are up for grabs right now. Your portal will show them here as soon as they
          exist.
        </p>
      ) : null}

      {sessions.map((session) => (
        <article
          className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
          key={session.id}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-charcoal)]/50">
            {session.reference} · {session.status.replaceAll("_", " ")}
          </p>
          <h4 className="mt-2 text-lg font-black">{session.mainName}</h4>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            {formatDate(session.scheduledDate)} at {session.timeSlot}
            {session.serviceArea ? ` · ${session.serviceArea}` : ""}
          </p>
          {session.chefPayoutCents != null ? (
            <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
              You receive {formatZar(session.chefPayoutCents)}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            {session.estate ? `${session.estate}, ` : ""}
            {session.street}
          </p>
          <div className="mt-4">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => setPendingId(session.id)}
              type="button"
            >
              {busy && pendingId === session.id ? "Claiming..." : "Claim this session"}
            </button>
          </div>
        </article>
      ))}

      {pendingId ? (
        <AvailabilityConfirmModal
          busy={busy}
          onCancel={() => setPendingId(null)}
          onConfirm={confirm}
          session={{
            reference: sessions.find((session) => session.id === pendingId)?.reference ?? "",
            mainName: sessions.find((session) => session.id === pendingId)?.mainName ?? "",
            scheduledDate:
              sessions.find((session) => session.id === pendingId)?.scheduledDate ?? "",
            timeSlot: sessions.find((session) => session.id === pendingId)?.timeSlot ?? "",
            chefPayoutCents:
              sessions.find((session) => session.id === pendingId)?.chefPayoutCents ?? 0,
            outsideAvailability: sessionFallsOutside(
              sessions.find((session) => session.id === pendingId)?.scheduledDate ?? "",
              sessions.find((session) => session.id === pendingId)?.timeSlot ?? "",
              availability,
            ),
          }}
        />
      ) : null}
    </section>
  );
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}
