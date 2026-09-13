"use client";

import { useState } from "react";
import {
  releaseSessionClaim,
  availabilityFromRecord,
  claimAvailableSession,
  alignSessionAvailability,
  type AvailableSession,
  type ChefProfile,
} from "./api/platformClient";
import { AvailabilityConfirmModal, sessionFallsOutside } from "./AvailabilityConfirmModal";

interface AvailableSessionsPanelProps {
  readonly sessions: readonly AvailableSession[];
  readonly profile: ChefProfile | null;
  readonly busyKey: string | null;
  readonly onClaimed: (reference: string, payoutCents: number) => void;
  readonly onAligned?: (reference: string) => void;
  readonly onReleased?: (reference: string, rebroadcastOffers: number) => void;
  readonly run: (name: string, action: () => Promise<void>) => void;
}

function isPaid(session: AvailableSession): boolean {
  return session.paymentStatus === "VERIFIED";
}

export function AvailableSessionsPanel({
  sessions,
  profile,
  busyKey,
  onClaimed,
  onAligned,
  onReleased,
  run,
}: AvailableSessionsPanelProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);
  const availability = availabilityFromRecord(profile?.availability);
  const pendingSession = sessions.find((session) => session.id === pendingId) ?? null;
  const pendingReleaseSession = sessions.find((session) => session.id === pendingReleaseId) ?? null;
  const busy =
    busyKey === "claim-session" || busyKey === "align-session" || busyKey === "release-session";

  const confirm = (): void => {
    if (!pendingSession) return;
    const session = pendingSession;
    run("claim-session", async () => {
      const result = await claimAvailableSession(session.id);
      setPendingId(null);
      onClaimed(result.booking.reference, result.booking.chefPayoutCents ?? 0);
    });
  };

  const confirmAlign = (): void => {
    if (!pendingSession) return;
    const session = pendingSession;
    run("align-session", async () => {
      await alignSessionAvailability(session.id);
      setPendingId(null);
      onAligned?.(session.reference);
    });
  };

  const confirmRelease = (): void => {
    if (!pendingReleaseSession) return;
    const session = pendingReleaseSession;
    run("release-session", async () => {
      const result = await releaseSessionClaim(session.id);
      setPendingReleaseId(null);
      onReleased?.(result.reference, result.rebroadcastOffers);
    });
  };

  return (
    <>
      <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">
        Sessions for the week ahead, paid or still awaiting payment confirmation. Claim a paid
        session and it&apos;s yours immediately — or align availability on an unpaid one and
        you&apos;re first in line the moment payment is confirmed. First come, first served.
      </p>

      {sessions.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
          No sessions are up for grabs right now. You&apos;ll also still receive personal offers
          when a booking matches your profile.
        </p>
      ) : null}

      {sessions.map((session) => {
        const paid = isPaid(session);
        const aligned = Boolean(session.claimedAt);
        return (
          <article
            className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
            key={session.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black">{session.mainName}</h3>
              {paid ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-900">
                  Paid
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900">
                  Awaiting payment
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
              {session.reference} · {formatDate(session.scheduledDate)} at {session.timeSlot}
              {session.serviceArea ? ` · ${session.serviceArea}` : ""}
            </p>
            {session.repeatVisits > 0 ? (
              <p className="mt-2 inline-flex rounded-full bg-[var(--color-oxblood)]/10 px-3 py-1 text-xs font-black text-[var(--color-oxblood)]">
                Repeat customer · {session.repeatVisits}
                {session.repeatVisits === 1 ? " completed visit" : " completed visits"}
              </p>
            ) : null}
            {session.chefPayoutCents != null ? (
              <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
                You receive {formatZar(session.chefPayoutCents)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {paid ? (
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={() => setPendingId(session.id)}
                  type="button"
                >
                  Claim this session
                </button>
              ) : aligned ? (
                <>
                  <span className="inline-flex min-h-10 items-center rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-900">
                    Availability aligned
                  </span>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-oxblood)]/30 px-4 text-sm font-bold text-[var(--color-oxblood)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy}
                    onClick={() => setPendingReleaseId(session.id)}
                    type="button"
                  >
                    Release availability
                  </button>
                </>
              ) : (
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={() => setPendingId(session.id)}
                  type="button"
                >
                  Align availability
                </button>
              )}
            </div>
          </article>
        );
      })}

      {pendingSession ? (
        <AvailabilityConfirmModal
          busy={busy}
          onCancel={() => setPendingId(null)}
          onConfirm={isPaid(pendingSession) ? confirm : confirmAlign}
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

      {pendingReleaseSession ? (
        <AvailabilityConfirmModal
          busy={busy}
          onCancel={() => setPendingReleaseId(null)}
          onConfirm={confirmRelease}
          session={{
            reference: pendingReleaseSession.reference,
            mainName: pendingReleaseSession.mainName,
            scheduledDate: formatDate(pendingReleaseSession.scheduledDate),
            timeSlot: pendingReleaseSession.timeSlot,
            chefPayoutCents: pendingReleaseSession.chefPayoutCents ?? 0,
            outsideAvailability: false,
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
