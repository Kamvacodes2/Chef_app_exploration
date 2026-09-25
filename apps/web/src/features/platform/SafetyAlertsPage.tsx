"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acknowledgeSafetyAlert,
  fetchSafetyAlerts,
  resolveSafetyAlert,
} from "@/features/safety/api/safetyClient";
import type { PanicAlert } from "@/features/safety/api/safetyClient";

const REFRESH_MS = 5_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function stalenessSeconds(lastPingAt: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(lastPingAt).getTime()) / 1000));
}

function StatusPill({ alert }: { readonly alert: PanicAlert }) {
  if (alert.status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-800">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
        Active
      </span>
    );
  }
  if (alert.status === "ACKNOWLEDGED") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
        Acknowledged
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--color-charcoal)]/10 px-2.5 py-0.5 text-xs font-black text-[var(--color-charcoal)]/60">
      Resolved
    </span>
  );
}

function AlertCard({
  alert,
  busyId,
  onAcknowledge,
  onResolve,
}: {
  readonly alert: PanicAlert;
  readonly busyId: string | null;
  readonly onAcknowledge: (alert: PanicAlert) => void;
  readonly onResolve: (alert: PanicAlert) => void;
}) {
  const stale = stalenessSeconds(alert.lastPingAt);
  const sourceLabel = alert.source === "CHEF" ? "Chef" : "Customer";
  return (
    <article
      className={`rounded-2xl border p-5 ${
        alert.status === "RESOLVED"
          ? "border-[var(--color-charcoal)]/10 bg-white"
          : "border-red-300 bg-red-50/50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill alert={alert} />
          <span className="text-sm font-black text-[var(--color-oxblood)]">
            {sourceLabel} {alert.raisedBy.displayName}
          </span>
          <span className="text-xs font-semibold text-[var(--color-charcoal)]/50">
            raised {formatTime(alert.firstPingAt)}
          </span>
        </div>
        <div className="flex gap-2">
          {alert.status !== "ACKNOWLEDGED" && alert.status !== "RESOLVED" ? (
            <button
              type="button"
              disabled={busyId === alert.id}
              onClick={() => onAcknowledge(alert)}
              className="min-h-9 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 disabled:opacity-50"
            >
              Acknowledge
            </button>
          ) : null}
          {alert.status !== "RESOLVED" ? (
            <button
              type="button"
              disabled={busyId === alert.id}
              onClick={() => onResolve(alert)}
              className="min-h-9 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              Resolve — all safe
            </button>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="font-semibold text-[var(--color-charcoal)]/55">Contact</dt>
          <dd className="text-[var(--color-charcoal)]">
            {alert.raisedBy.email}
            {alert.raisedBy.phone ? ` · ${alert.raisedBy.phone}` : ""}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-[var(--color-charcoal)]/55">Booking</dt>
          <dd className="text-[var(--color-charcoal)]">
            {alert.booking
              ? `${alert.booking.reference} · ${alert.booking.address ?? "address on file"}`
              : "—"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-[var(--color-charcoal)]/55">Last position</dt>
          <dd className="text-[var(--color-charcoal)]">
            {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
            {alert.accuracyMeters != null ? ` (±${alert.accuracyMeters} m)` : ""}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-[var(--color-charcoal)]/55">Last update</dt>
          <dd className={stale > 60 ? "font-bold text-red-700" : "text-[var(--color-charcoal)]"}>
            {formatTime(alert.lastPingAt)} · {alert.pingCount} pings
            {stale > 60 ? ` · stale ${stale}s — device may be offline or moving` : ""}
          </dd>
        </div>
      </dl>

      {alert.note ? (
        <p className="mt-2 rounded-xl bg-white/80 p-3 text-sm italic text-[var(--color-charcoal)]">
          “{alert.note}”
        </p>
      ) : null}

      <a
        href={alert.mapUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[var(--color-oxblood)] px-4 text-sm font-bold text-white hover:opacity-90"
      >
        Open live map pin →
      </a>
    </article>
  );
}

export function SafetyAlertsPage() {
  const [alerts, setAlerts] = useState<readonly PanicAlert[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [open, resolved] = await Promise.all([
        fetchSafetyAlerts({ status: "OPEN", limit: 100 }),
        fetchSafetyAlerts({ status: "RESOLVED", limit: 30 }),
      ]);
      setAlerts([...open, ...resolved]);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load alerts");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    tickRef.current = setInterval(() => void load(), REFRESH_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [load]);

  const act = useCallback(async (alert: PanicAlert, action: "acknowledge" | "resolve") => {
    setBusyId(alert.id);
    try {
      const updated =
        action === "acknowledge"
          ? await acknowledgeSafetyAlert(alert.id)
          : await resolveSafetyAlert(alert.id);
      setAlerts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }, []);

  const visible = useMemo(
    () => (showResolved ? alerts : alerts.filter((alert) => alert.status !== "RESOLVED")),
    [alerts, showResolved],
  );
  const openCount = alerts.filter((alert) => alert.status !== "RESOLVED").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Safety Alerts</h1>
          <p className="text-sm text-[var(--color-charcoal)]/65">
            Live panic-alert tracking. Auto-refreshes every 5 seconds.
            {openCount > 0
              ? ` ${openCount} open alert${openCount === 1 ? "" : "s"} right now.`
              : " No open alerts."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-charcoal)]/70">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(event) => setShowResolved(event.target.checked)}
            className="h-4 w-4"
          />
          Show resolved
        </label>
      </header>

      {openCount > 0 ? (
        <div className="rounded-2xl border-l-4 border-red-600 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">
          🚨 An open panic alert needs attention. Open the map pin, phone the person, and resolve
          only when everyone is safe.
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      {!loaded ? (
        <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/70">
          Loading alerts…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-[var(--color-charcoal)]/65">
          No safety alerts{showResolved ? "" : " (tick “Show resolved” to include past alerts)"}.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              busyId={busyId}
              onAcknowledge={(item) => void act(item, "acknowledge")}
              onResolve={(item) => void act(item, "resolve")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
