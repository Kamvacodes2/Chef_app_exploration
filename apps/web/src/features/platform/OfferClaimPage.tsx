"use client";

import { useEffect, useState, type ReactElement } from "react";
import { getChefmateApiUrl } from "@/lib/env";
import { AvailabilityConfirmModal } from "./AvailabilityConfirmModal";

interface OfferClaimOffer {
  readonly id: string;
  readonly status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";
  readonly chefPayoutCents: number;
  readonly expiresAt: string;
  readonly booking: {
    readonly id: string;
    readonly reference: string;
    readonly mainName: string;
    readonly scheduledDate: string;
    readonly timeSlot: string;
    readonly serviceArea: string | null;
  };
}

interface ClaimLookupResponse {
  readonly status: "available" | "accepted" | "expired" | "invalid";
  readonly offer: OfferClaimOffer | null;
}

interface ClaimResponse {
  readonly status: "claimed" | "accepted" | "expired" | "invalid";
  readonly offer: OfferClaimOffer | null;
}

function claimUrl(token: string | null): string {
  return getChefmateApiUrl() + "/api/v1/chef/offers/claim/" + encodeURIComponent(token ?? "");
}

function formatZar(cents: number): string {
  return (
    "R" +
    (cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function unavailableMessage(): string {
  return "This session link is no longer available.";
}

export function OfferClaimPage({ token }: { readonly token: string | null }): ReactElement {
  const [details, setDetails] = useState<ClaimLookupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<ClaimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(unavailableMessage());
      return;
    }
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        const response = await fetch(claimUrl(token), { signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const payload = (await response.json()) as { data: ClaimLookupResponse };
        setDetails(payload.data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? unavailableMessage() : unavailableMessage());
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [token]);

  async function claim(): Promise<void> {
    if (!token || claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const response = await fetch(claimUrl(token), { method: "POST" });
      if (!response.ok) throw new Error("unavailable");
      const payload = (await response.json()) as { data: ClaimResponse };
      setClaimed(payload.data);
    } catch (claimError) {
      setError(claimError instanceof Error ? unavailableMessage() : unavailableMessage());
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-oxblood)]/60">
          Loading session...
        </p>
      </main>
    );
  }

  const claimedOutcome = claimed?.status === "claimed";
  const alreadyTaken =
    claimed?.status === "accepted" || (!claimedOutcome && details?.status === "accepted");
  const expired = !claimedOutcome && details?.status === "expired";

  if (error) {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-parchment)] p-8 text-center">
          <h1 className="font-display text-2xl text-[var(--color-oxblood)]">Session unavailable</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-parchment)] p-8 text-center">
          <h1 className="font-display text-2xl text-[var(--color-oxblood)]">Session unavailable</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">{unavailableMessage()}</p>
        </div>
      </main>
    );
  }

  const offer = claimed?.offer ?? details.offer;

  const runClaim = async (): Promise<void> => {
    setConfirmOpen(false);
    await claim();
  };

  if (claimedOutcome && offer) {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-[var(--color-parchment)] p-8 text-center">
          <p className="text-4xl" aria-hidden="true">
            🎉
          </p>
          <h1 className="mt-3 font-display text-2xl text-emerald-800">Session claimed!</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">
            You got the <strong>{offer.booking.mainName}</strong> session ({offer.booking.reference}
            ) for{" "}
            <strong>
              {formatDate(offer.booking.scheduledDate)} at {offer.booking.timeSlot}
            </strong>
            . The system has matched you immediately — check your chef portal for the full details
            and prep guide.
          </p>
        </div>
      </main>
    );
  }

  if (alreadyTaken) {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-parchment)] p-8 text-center">
          <p className="text-4xl" aria-hidden="true">
            😕
          </p>
          <h1 className="mt-3 font-display text-2xl text-[var(--color-oxblood)]">
            Session already accepted
          </h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">
            Another chef claimed this session first. It is no longer available — keep an eye on your
            inbox for the next session that comes up for grabs.
          </p>
        </div>
      </main>
    );
  }

  if (expired || details.status === "invalid") {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-parchment)] p-8 text-center">
          <h1 className="font-display text-2xl text-[var(--color-oxblood)]">Session unavailable</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">{unavailableMessage()}</p>
        </div>
      </main>
    );
  }

  if (!offer) {
    return (
      <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-parchment)] p-8 text-center">
          <h1 className="font-display text-2xl text-[var(--color-oxblood)]">Session unavailable</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70">{unavailableMessage()}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[var(--color-cream)] px-4 py-16 text-[var(--color-charcoal)]">
      <div className="mx-auto max-w-xl">
        <p className="text-center text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-oxblood)]/60">
          Session available for grabs
        </p>
        <div className="mt-6 rounded-2xl border border-[var(--color-oxblood)]/10 bg-[var(--color-parchment)] p-8">
          <h1 className="font-display text-3xl text-[var(--color-oxblood)]">
            {offer.booking.mainName}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
            {offer.booking.reference} · {formatDate(offer.booking.scheduledDate)} at{" "}
            {offer.booking.timeSlot}
            {offer.booking.serviceArea ? ` · ${offer.booking.serviceArea}` : ""}
          </p>
          <p className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
            You receive {formatZar(offer.chefPayoutCents)}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-[var(--color-charcoal)]/70">
            First come, first served — the first chef to accept is confirmed immediately, and the
            session then disappears for everyone else.
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={claiming}
            className="mt-6 w-full rounded-xl bg-[var(--color-oxblood)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {claiming ? "Claiming..." : "Accept this session"}
          </button>
        </div>
      </div>

      {confirmOpen ? (
        <AvailabilityConfirmModal
          busy={claiming}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void runClaim()}
          session={{
            reference: offer.booking.reference,
            mainName: offer.booking.mainName,
            scheduledDate: formatDate(offer.booking.scheduledDate),
            timeSlot: offer.booking.timeSlot,
            chefPayoutCents: offer.chefPayoutCents,
            outsideAvailability: false,
          }}
        />
      ) : null}
    </main>
  );
}
