"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { createCustomerAccount, signIn, type AuthenticatedUser } from "./api/authClient";

type AuthMode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistering = mode === "register";

  const switchMode = (nextMode: AuthMode): void => {
    setMode(nextMode);
    setError(null);
    setUser(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = isRegistering
        ? await createCustomerAccount({ displayName, email, password })
        : await signIn({ email, password });
      setUser(authenticatedUser);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chefmate could not sign you in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[var(--color-warm-cream)] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-[1040px] gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.72fr)] lg:items-center">
        <section className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-terracotta)]">
            Your Chefmate account
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[var(--color-oxblood)] sm:text-5xl">
            Make every meal feel taken care of.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[var(--color-charcoal)]/75">
            Sign in to keep your bookings together, or create your customer account to begin.
          </p>
        </section>

        <section
          className="rounded-lg border border-[var(--color-oxblood)]/15 bg-white p-5 shadow-[0_16px_42px_rgba(83,31,27,0.1)] sm:p-7"
          aria-labelledby="account-heading"
        >
          <div
            className="inline-flex w-full rounded-lg border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)] p-1"
            role="tablist"
            aria-label="Account action"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={tabClassName(mode === "login")}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={tabClassName(mode === "register")}
              onClick={() => switchMode("register")}
            >
              Create account
            </button>
          </div>

          <h2
            id="account-heading"
            className="mt-7 font-display text-3xl font-semibold text-[var(--color-oxblood)]"
          >
            {isRegistering ? "Create your account" : "Welcome back"}
          </h2>

          {user ? (
            <div className="mt-5 space-y-5" role="status">
              <p className="text-base leading-7 text-[var(--color-charcoal)]/80">
                Signed in as {user.displayName}.
              </p>
              <div className="flex flex-wrap gap-3">
                {postLoginLinks(user.roles).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={submit}>
              {isRegistering ? (
                <label
                  className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
                  htmlFor="display-name"
                >
                  Your name
                  <input
                    id="display-name"
                    name="displayName"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                  />
                </label>
              ) : null}

              <label
                className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
                htmlFor="email"
              >
                Email address
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                />
              </label>

              <label
                className="grid gap-2 text-sm font-bold text-[var(--color-charcoal)]"
                htmlFor="password"
              >
                Password
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  required
                  minLength={isRegistering ? 12 : 1}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--color-oxblood)]/25 bg-white px-3 text-base font-normal text-[var(--color-charcoal)] outline-none transition placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:ring-2 focus:ring-[var(--color-terracotta)]/35"
                />
                {isRegistering ? (
                  <span className="font-normal text-[var(--color-charcoal)]/65">
                    Use at least 12 characters, including uppercase, lowercase, and a number.
                  </span>
                ) : null}
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
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-oxblood)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
              >
                {isSubmitting ? "Please wait" : isRegistering ? "Create account" : "Sign in"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

interface PostLoginLink {
  readonly href: string;
  readonly label: string;
}

function postLoginLinks(roles: AuthenticatedUser["roles"]): readonly PostLoginLink[] {
  const links: PostLoginLink[] = [];

  if (roles.includes("ADMIN") || roles.includes("SUPPORT")) {
    links.push({ href: "/admin", label: "Go to admin dashboard" });
  }

  if (roles.includes("CHEF")) {
    links.push({ href: "/chef/portal", label: "Go to chef portal" });
  }

  if (roles.includes("CUSTOMER")) {
    links.push({ href: "/customer/dashboard", label: "Go to customer dashboard" });
  }

  if (links.length === 0) {
    links.push({ href: "/#order-flow", label: "Book a chef" });
  }

  return links;
}

function tabClassName(isActive: boolean): string {
  return [
    "min-h-10 flex-1 rounded-md px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-terracotta)]",
    isActive
      ? "bg-[var(--color-oxblood)] text-white"
      : "text-[var(--color-oxblood)] hover:bg-white",
  ].join(" ");
}
