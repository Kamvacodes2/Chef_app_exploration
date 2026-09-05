"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { PolicyAcceptanceModal } from "@/components/ui/PolicyAcceptanceModal";
import {
  consumeChefImportActivation,
  fetchPolicyStatus,
  setAccountPassword,
  type PlatformUser,
} from "@/features/platform/api/platformClient";
import type { PolicyStatusItem } from "@/features/platform/api/platformClient";

type ActivationState =
  | { status: "loading" }
  | { status: "ready"; user: PlatformUser }
  | { status: "error"; message: string };

/**
 * One-time activation for chefs whose accounts and data were imported from
 * the legacy easychefapp system. The secure email link signs the chef in,
 * then they review and accept the current Chefmate chef policies and set a
 * password so they can sign in on any device. No document re-uploads are
 * required — their compliance profile came across with the import.
 */
export function ChefImportActivationPage({
  token,
}: {
  readonly token: string | null;
}): ReactElement {
  const [state, setState] = useState<ActivationState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [policyStatus, setPolicyStatus] = useState<PolicyStatusItem[] | null>(null);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const activationStarted = useRef(false);

  useEffect(() => {
    if (activationStarted.current) return;
    activationStarted.current = true;

    let active = true;
    if (!token) {
      setState({
        status: "error",
        message: "This chef activation link is missing its token.",
      });
      return () => {
        active = false;
      };
    }

    void consumeChefImportActivation(token)
      .then(async (user) => {
        if (active) {
          setState({ status: "ready", user });
          try {
            const status = await fetchPolicyStatus();
            if (active) setPolicyStatus(status);
          } catch {
            // If the status check fails, still let the chef continue.
          }
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error ? error.message : "This activation link could not be used.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const requiredPending =
    policyStatus?.filter((policy) => policy.required && !policy.accepted) ?? [];
  const passwordSaved = passwordMessage !== null;

  const savePassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (password !== passwordConfirmation) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await setAccountPassword(password);
      setPasswordMessage("Password saved. You can use your email and password on any device.");
      setPassword("");
      setPasswordConfirmation("");
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error ? error.message : "Chefmate could not save your password.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[var(--color-warm-cream)] px-4 py-12 sm:px-6 sm:py-20">
      <section className="mx-auto max-w-2xl rounded-lg border border-[var(--color-oxblood)]/15 bg-white p-6 shadow-[0_16px_42px_rgba(83,31,27,0.1)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-terracotta)]">
          Chef account
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[var(--color-oxblood)]">
          Your Chefmate chef account is ready.
        </h1>

        {state.status === "loading" ? (
          <p className="mt-5 text-[var(--color-charcoal)]/75" role="status">
            Signing you in securely…
          </p>
        ) : null}

        {state.status === "error" ? (
          <p
            className="mt-5 rounded-lg border border-[var(--color-terracotta)]/35 bg-[var(--color-terracotta)]/10 px-4 py-3 text-sm font-medium text-[var(--color-oxblood)]"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" ? (
          <div className="mt-6 space-y-7">
            {policyStatus !== null && requiredPending.length > 0 && !policiesAccepted ? (
              <PolicyAcceptanceModal
                mode="required"
                policies={requiredPending}
                onComplete={async () => {
                  const nextStatus = await fetchPolicyStatus();
                  setPolicyStatus(nextStatus);
                  setPoliciesAccepted(true);
                }}
              />
            ) : null}

            <div className="rounded-lg bg-[var(--color-warm-cream)] p-4" role="status">
              <p className="font-semibold text-[var(--color-oxblood)]">
                You are signed in as {state.user.displayName}.
              </p>
              <p className="mt-1 text-sm text-[var(--color-charcoal)]/75">
                Your chef profile has been brought across from the easychefapp system and your
                account is now active. Review and accept the current Chefmate chef terms above, then
                set a password below so you can sign in from any device.
              </p>
            </div>

            <form
              className="space-y-4 border-t border-[var(--color-oxblood)]/10 pt-6"
              onSubmit={savePassword}
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-[var(--color-oxblood)]">
                  Set your password
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/70">
                  Create a password now so you can sign in from any device without requesting
                  another email link.
                </p>
              </div>

              <label
                className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
                htmlFor="chef-activation-password"
              >
                Create password
              </label>
              <div className="relative">
                <input
                  id="chef-activation-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-oxblood)]/25 px-3 pr-12 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[var(--color-charcoal)]/50 outline-none hover:text-[var(--color-oxblood)] focus-visible:text-[var(--color-oxblood)] focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta)]/35"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              <label
                className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
                htmlFor="chef-activation-password-confirmation"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="chef-activation-password-confirmation"
                  type={showPasswordConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-oxblood)]/25 px-3 pr-12 text-base font-normal outline-none focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((visible) => !visible)}
                  aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                  aria-pressed={showPasswordConfirm}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[var(--color-charcoal)]/50 outline-none hover:text-[var(--color-oxblood)] focus-visible:text-[var(--color-oxblood)] focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta)]/35"
                >
                  {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {passwordError ? (
                <p className="text-sm font-medium text-[var(--color-oxblood)]" role="alert">
                  {passwordError}
                </p>
              ) : null}
              {passwordMessage ? (
                <p className="text-sm font-medium text-green-800" role="status">
                  {passwordMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPassword ? "Saving…" : "Save password"}
              </button>
            </form>

            {passwordSaved ? (
              <Link
                href="/chef/portal"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90"
              >
                Open my chef portal
              </Link>
            ) : (
              <p
                className="rounded-lg border border-[var(--color-terracotta)]/35 bg-[var(--color-terracotta)]/10 px-4 py-3 text-sm font-medium text-[var(--color-oxblood)]"
                role="status"
              >
                Save your password above to finish activating your account. Your chef portal will
                unlock as soon as it&apos;s saved.
              </p>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function EyeIcon(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
