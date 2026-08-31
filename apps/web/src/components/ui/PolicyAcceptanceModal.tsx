"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { acceptPolicy, type PolicyStatusItem } from "@/features/platform/api/platformClient";

interface PolicyAcceptanceModalProps {
  readonly policies: readonly PolicyStatusItem[];
  readonly mode?: "required" | "optional";
  readonly onComplete: () => void | Promise<void>;
  readonly onClose?: () => void;
  readonly onLeave?: () => void | Promise<void>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PolicyAcceptanceModal({
  mode = "required",
  policies,
  onComplete,
  onClose,
  onLeave,
}: PolicyAcceptanceModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const [acceptedLocally, setAcceptedLocally] = useState<ReadonlySet<string>>(() => new Set());
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingPolicies = useMemo(
    () =>
      policies.filter(
        (policy) =>
          !policy.accepted && !acceptedLocally.has(`${policy.policyKey}:${policy.requiredVersion}`),
      ),
    [acceptedLocally, policies],
  );
  const current = pendingPolicies[0];
  const currentIdentity = current
    ? `${current.policyKey}:${current.requiredVersion}`
    : "confirmation";
  const processedCount = policies.filter(
    (policy) =>
      !policy.accepted && acceptedLocally.has(`${policy.policyKey}:${policy.requiredVersion}`),
  ).length;
  const totalCount = processedCount + pendingPolicies.length;
  const dismissible = mode === "optional" && onClose !== undefined;

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    setAcknowledged(false);
    setError(null);
    titleRef.current?.focus();
  }, [currentIdentity]);

  const completeAndConfirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setConfirming(true);
    setError(null);
    try {
      await onComplete();
      setConfirming(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your acceptance was saved, but its status could not be confirmed.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!current || !acknowledged || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await acceptPolicy(current.policyKey, current.requiredVersion);
      const acceptedIdentity = `${current.policyKey}:${current.requiredVersion}`;
      setAcceptedLocally((previous) => new Set(previous).add(acceptedIdentity));
      setAcknowledged(false);

      if (pendingPolicies.length === 1) {
        setConfirming(true);
        await onComplete();
        setConfirming(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to accept this policy.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (dismissible && !busy) onClose?.();
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    const activeIndex =
      document.activeElement instanceof HTMLElement
        ? focusable.indexOf(document.activeElement)
        : -1;
    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeIndex === -1 || document.activeElement === last)) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (dismissible && !busy && event.target === event.currentTarget) onClose?.();
  };

  const heading = current?.title ?? "Confirming policy status";
  const description = current
    ? `Policy ${Math.min(processedCount + 1, totalCount)} of ${totalCount}. Review the published document and acknowledge it to continue.`
    : "Your acceptance has been saved. ChefMate must confirm your current policy status before continuing.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={handleBackdrop}
    >
      <div
        ref={dialogRef}
        aria-busy={busy}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl"
        onKeyDown={handleKeyDown}
        role="dialog"
        tabIndex={-1}
      >
        <div className="shrink-0 border-b border-[var(--color-oxblood)]/10 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <h2
              ref={titleRef}
              className="text-lg font-black text-[var(--color-oxblood)] outline-none"
              id={titleId}
              tabIndex={-1}
            >
              {heading}
            </h2>
            {dismissible ? (
              <button
                aria-label="Close policy review"
                className="rounded-lg p-1 text-[var(--color-charcoal)]/50 hover:text-[var(--color-charcoal)] disabled:opacity-50"
                disabled={busy}
                onClick={onClose}
                type="button"
              >
                <span aria-hidden="true">&#10005;</span>
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--color-charcoal)]/60" id={descriptionId}>
            {description}
          </p>
        </div>

        {current ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-[var(--color-charcoal)]/75">
            {current.stale ? (
              <div className="mt-4 rounded-xl border-l-4 border-amber-600 bg-amber-50 p-4 text-amber-950">
                <p className="font-semibold">This policy has been updated.</p>
                <p className="mt-1 text-xs">
                  Please review the current document and acknowledge it again to continue.
                </p>
              </div>
            ) : null}

            <a
              className="mt-5 inline-flex rounded-xl border border-[var(--color-oxblood)] px-4 py-2.5 font-bold text-[var(--color-oxblood)] transition-colors hover:bg-[var(--color-oxblood)] hover:text-white"
              href={current.documentPath}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open {current.title}
              <span className="sr-only"> in a new tab</span>
            </a>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-oxblood)]/15 p-4">
              <input
                checked={acknowledged}
                className="mt-0.5 h-4 w-4 accent-[var(--color-oxblood)]"
                disabled={busy}
                onChange={(event) => setAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>I acknowledge that I have reviewed and accept {current.title}.</span>
            </label>
          </div>
        ) : (
          <div className="flex-1 px-6 py-8 text-sm text-[var(--color-charcoal)]/75">
            Your policy acceptance must be checked against the current server version before access
            is restored.
          </div>
        )}

        <div aria-atomic="true" aria-live="polite" className="min-h-0">
          {busy ? (
            <p className="bg-blue-50 px-6 py-2 text-xs font-semibold text-blue-900" role="status">
              {confirming ? "Confirming current policy status..." : "Saving your acceptance..."}
            </p>
          ) : null}
          {error ? (
            <p className="bg-red-50 px-6 py-2 text-xs font-semibold text-red-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 space-y-3 border-t border-[var(--color-oxblood)]/10 px-6 py-4">
          {current ? (
            <button
              className="w-full rounded-xl bg-[var(--color-oxblood)] py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!acknowledged || busy}
              onClick={() => void handleAccept()}
              type="button"
            >
              {busy ? "Please wait..." : "Accept"}
            </button>
          ) : (
            <button
              className="w-full rounded-xl bg-[var(--color-oxblood)] py-3 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => void completeAndConfirm()}
              type="button"
            >
              {busy ? "Confirming..." : "Retry status confirmation"}
            </button>
          )}
          {onLeave ? (
            <button
              className="w-full rounded-xl py-2 text-sm font-semibold text-[var(--color-charcoal)]/70 underline-offset-4 hover:underline disabled:opacity-50"
              disabled={busy}
              onClick={() => void onLeave()}
              type="button"
            >
              Log out and leave the Chef Portal
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
