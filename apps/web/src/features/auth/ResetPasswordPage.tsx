"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import type { ReactElement } from "react";
import { resetPassword } from "./api/authClient";

type ResetState = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

export function ResetPasswordPage({ token }: { readonly token: string }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [state, setState] = useState<ResetState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setState({ status: "idle" });

    if (password !== passwordConfirmation) {
      setState({ status: "error", message: "The passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setState({ status: "success" });
    } catch (reason) {
      setState({
        status: "error",
        message:
          reason instanceof Error
            ? reason.message
            : "This reset link could not be used. It may have expired or already been used.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[var(--color-warm-cream)] px-4 py-12 sm:px-6 sm:py-20">
      <section className="mx-auto max-w-md rounded-lg border border-[var(--color-oxblood)]/15 bg-white p-6 shadow-[0_16px_42px_rgba(83,31,27,0.1)] sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-terracotta)]">
          Account recovery
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[var(--color-oxblood)]">
          Choose a new password
        </h1>

        {state.status === "success" ? (
          <div className="mt-6 space-y-5" role="status">
            <p className="rounded-lg border border-green-800/25 bg-green-50 px-4 py-3 text-sm font-medium leading-6 text-green-900">
              Your password has been reset. You can now sign in with your email address and your new
              password.
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <p className="text-sm leading-6 text-[var(--color-charcoal)]/70">
              Use at least 12 characters, including uppercase, lowercase, and a number.
            </p>

            <label
              className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
              htmlFor="reset-password"
            >
              New password
              <div className="relative">
                <input
                  id="reset-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-oxblood)]/25 px-3 pr-12 text-base font-normal text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[var(--color-charcoal)]/50 outline-none hover:text-[var(--color-oxblood)] focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta)]/35"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            <label
              className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
              htmlFor="reset-password-confirmation"
            >
              Confirm new password
              <div className="relative">
                <input
                  id="reset-password-confirmation"
                  name="passwordConfirmation"
                  type={showPasswordConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-oxblood)]/25 px-3 pr-12 text-base font-normal text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((visible) => !visible)}
                  aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                  aria-pressed={showPasswordConfirm}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[var(--color-charcoal)]/50 outline-none hover:text-[var(--color-oxblood)] focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta)]/35"
                >
                  {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            {state.status === "error" ? (
              <p
                role="alert"
                className="rounded-lg border border-[var(--color-terracotta)]/35 bg-[var(--color-terracotta)]/10 px-3 py-2 text-sm font-medium text-[var(--color-oxblood)]"
              >
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Please wait" : "Save new password"}
            </button>

            <Link
              href="/login"
              className="inline-block text-sm font-semibold text-[var(--color-oxblood)] underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </form>
        )}
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
