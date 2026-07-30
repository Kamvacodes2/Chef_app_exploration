"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { consumeChefMagicLink, type PlatformUser } from "./api/platformClient";

interface ChefMagicLoginPageProps {
  readonly token: string | null;
}

type MagicLoginState =
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly user: PlatformUser }
  | { readonly status: "error"; readonly message: string };

export function ChefMagicLoginPage({ token }: ChefMagicLoginPageProps) {
  const [state, setState] = useState<MagicLoginState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    const consume = async (): Promise<void> => {
      if (!token) {
        setState({ status: "error", message: "This chef portal link is missing its token." });
        return;
      }

      try {
        const user = await consumeChefMagicLink(token);
        if (active) setState({ status: "success", user });
      } catch (caught) {
        if (!active) return;
        setState({
          status: "error",
          message:
            caught instanceof Error ? caught.message : "This chef portal link could not be used.",
        });
      }
    };

    void consume();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="bg-[var(--color-warm-cream)] px-4 py-16 text-[var(--color-charcoal)] sm:px-6">
      <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--color-terracotta)]">
          Chef portal
        </p>
        <h1 className="mt-4 text-4xl font-black text-[var(--color-oxblood)]">
          {state.status === "success" ? "You are signed in." : "Opening your chef portal..."}
        </h1>

        {state.status === "loading" ? (
          <p className="mt-4 text-[var(--color-charcoal)]/75" role="status">
            Checking your secure magic link.
          </p>
        ) : null}

        {state.status === "success" ? (
          <div className="mt-5" role="status">
            <p className="text-[var(--color-charcoal)]/75">
              Welcome, {state.user.displayName}. Finish your profile, bank details, and availability
              so you can receive job offers.
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--color-oxblood)] px-6 font-bold text-white"
              href="/chef/portal"
            >
              Open chef portal
            </Link>
          </div>
        ) : null}

        {state.status === "error" ? (
          <p
            className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
