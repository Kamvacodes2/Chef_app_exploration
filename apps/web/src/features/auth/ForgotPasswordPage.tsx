"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { requestPasswordReset } from "./api/authClient";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chefmate could not send a reset link.");
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
          Reset your password
        </h1>

        {sent ? (
          <div className="mt-6 space-y-5" role="status">
            <p className="rounded-lg border border-green-800/25 bg-green-50 px-4 py-3 text-sm font-medium leading-6 text-green-900">
              If an account exists for that email address, we&apos;ve sent a secure one-time
              password reset link. It expires in one hour and can only be used once.
            </p>
            <p className="text-sm leading-6 text-[var(--color-charcoal)]/70">
              Follow the link in the email to choose a new password. Check your spam folder if it
              doesn&apos;t arrive within a few minutes.
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-oxblood)]/25 px-5 text-sm font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)]"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <p className="text-sm leading-6 text-[var(--color-charcoal)]/70">
              Enter the email address you use to sign in. We&apos;ll send you a link to choose a new
              password.
            </p>

            <label
              className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
              htmlFor="reset-email"
            >
              Email address
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-[var(--color-terracotta)]/35 bg-[var(--color-terracotta)]/10 px-3 py-2 text-sm font-medium text-[var(--color-oxblood)]"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Please wait" : "Send reset link"}
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
