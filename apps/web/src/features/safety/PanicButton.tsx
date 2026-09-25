"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelMyPanicAlert,
  fetchMyOpenAlert,
  raisePanicAlert,
  streamPanicLocation,
} from "@/features/safety/api/safetyClient";
import type { PanicAlert } from "@/features/safety/api/safetyClient";

const PING_INTERVAL_MS = 10_000;

type PanicPhase = "idle" | "locating" | "sending" | "active" | "stopping";

interface PanicButtonProps {
  /** Context label shown in the confirm dialog ("visit CM00555" etc). */
  readonly contextLabel?: string;
  readonly bookingRequestId?: string;
}

interface PositionErrorLike {
  readonly code: number;
  readonly message?: string;
}

function describeGeoError(error: PositionErrorLike): string {
  if (error.code === 1)
    return "Location permission was denied. Enable it in your browser settings to use the panic button.";
  if (error.code === 2)
    return "Your position is currently unavailable. Move to an open area and try again.";
  if (error.code === 3) return "Locating you took too long. Try again.";
  return error.message ?? "Could not determine your location.";
}

function describeFailure(caught: unknown): string {
  if (
    caught &&
    typeof caught === "object" &&
    "code" in caught &&
    typeof (caught as PositionErrorLike).code === "number"
  ) {
    return describeGeoError(caught as PositionErrorLike);
  }
  return caught instanceof Error
    ? caught.message
    : "Could not send the alert. Try again or phone support.";
}

function getCurrentFix(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This device does not support location sharing."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 0,
    });
  });
}

function fixFromPosition(position: GeolocationPosition) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy != null ? Math.round(position.coords.accuracy) : null,
    speedMps: position.coords.speed,
    headingDeg: position.coords.heading,
  };
}

export function PanicButton({ contextLabel, bookingRequestId }: PanicButtonProps) {
  const [phase, setPhase] = useState<PanicPhase>("idle");
  const [alert, setAlert] = useState<PanicAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPingLoop = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  // On mount: resume tracking if the user still has an open alert (e.g. they
  // reloaded the page mid-incident — the alert must keep streaming).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const open = await fetchMyOpenAlert();
        if (cancelled) return;
        if (open) {
          setAlert(open);
          setPhase("active");
        }
      } catch {
        // Portal may be logged out; the button simply stays idle.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The live location stream: one ping per interval while active.
  useEffect(() => {
    if (phase !== "active" || !alert || pingTimer.current) return;
    const streamOnce = async () => {
      try {
        const position = await getCurrentFix();
        const updated = await streamPanicLocation(alert.id, fixFromPosition(position));
        setAlert(updated);
      } catch {
        // A missed ping (tunnel, GPS hiccup) must not kill the stream; the
        // next interval retries. Admins see "last seen" staleness instead.
      }
    };
    const first = setTimeout(() => void streamOnce(), PING_INTERVAL_MS);
    pingTimer.current = setInterval(() => void streamOnce(), PING_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      stopPingLoop();
    };
  }, [phase, alert, stopPingLoop]);

  useEffect(() => stopPingLoop, [stopPingLoop]);

  const press = useCallback(async () => {
    setError(null);
    setPhase("locating");
    try {
      const position = await getCurrentFix();
      setPhase("sending");
      const created = await raisePanicAlert(fixFromPosition(position), {
        ...(bookingRequestId ? { bookingRequestId } : {}),
      });
      setAlert(created);
      setPhase("active");
      setConfirming(false);
    } catch (caught) {
      setPhase("idle");
      setError(describeFailure(caught));
    }
  }, [bookingRequestId]);

  const stop = useCallback(async () => {
    if (!alert) return;
    setPhase("stopping");
    try {
      await cancelMyPanicAlert(alert.id);
      stopPingLoop();
      setAlert(null);
      setPhase("idle");
    } catch (caught) {
      setPhase("active");
      setError(caught instanceof Error ? caught.message : "Could not cancel the alert.");
    }
  }, [alert, stopPingLoop]);

  const busy = phase === "locating" || phase === "sending" || phase === "stopping";
  const active = phase === "active" && alert !== null;
  const cancelLabel = phase === "stopping" ? "Cancelling…" : "I'm safe — cancel alert";

  return (
    <>
      {!active ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={busy}
          className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_10px_30px_rgba(220,38,38,0.5)] transition hover:bg-red-700 disabled:opacity-60"
          aria-label="Panic button — alert the Chefmate safety team"
          title="Panic button"
        >
          {phase === "locating" ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          )}
        </button>
      ) : (
        <div className="fixed bottom-6 right-6 z-50 w-[19rem] rounded-2xl border border-red-200 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <p className="text-sm font-black text-red-700">Safety alert active</p>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-[var(--color-charcoal)]/75">
            The Chefmate safety team can see your live location. It refreshes every 10 seconds until
            the alert is resolved.
          </p>
          <p className="mt-2 text-[11px] font-semibold text-[var(--color-charcoal)]/50">
            Last update: {new Date(alert.lastPingAt).toLocaleTimeString()} · {alert.pingCount}{" "}
            updates sent
          </p>
          <button
            type="button"
            onClick={() => void stop()}
            disabled={busy}
            className="mt-3 min-h-10 w-full rounded-xl border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      )}

      {confirming && !active ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-[var(--color-oxblood)]">Send panic alert?</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/80">
              This immediately alerts the Chefmate safety team and starts sharing your live location
              with them until you cancel or the alert is resolved.
              {contextLabel ? ` Context: ${contextLabel}.` : ""}
            </p>
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              If you are in immediate danger, also call the police on 10111.
            </p>
            {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 px-4 text-sm font-bold text-[var(--color-oxblood)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void press()}
                disabled={busy}
                className="min-h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {phase === "locating"
                  ? "Finding you…"
                  : phase === "sending"
                    ? "Sending…"
                    : phase === "stopping"
                      ? "Cancelling…"
                      : "Send alert"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
