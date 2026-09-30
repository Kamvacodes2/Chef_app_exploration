"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/features/auth/AuthContext";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { isSafeInternalPath } from "@/lib/safePath";

interface CustomerAuthGateProps {
  readonly children: ReactNode;
  readonly navItems: readonly NavItem[];
  readonly title: string;
}

/**
 * Client-side guard for /customer pages.
 *
 * While the session is being resolved the previous behavior (rendering the
 * dashboard shell immediately) leaked layout chrome to signed-out visitors;
 * signed-out visitors now see a neutral "Checking your session" frame and are
 * redirected to /login?next=<current path> once the session resolves.
 * Authorization itself remains enforced by the API (401s), this only fixes
 * where a signed-out visitor lands.
 */
export function CustomerAuthGate({ children, navItems, title }: CustomerAuthGateProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const current = `${window.location.pathname}${window.location.search}`;
    const nextParam = isSafeInternalPath(current) ? `?next=${encodeURIComponent(current)}` : "";
    router.replace(`/login${nextParam}`);
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)] p-6">
        <p className="text-sm font-semibold text-[var(--color-charcoal)]/75" role="status">
          Checking your session...
        </p>
        <span className="sr-only">Loading</span>
      </main>
    );
  }

  // Until the router effect completes, keep hiding the dashboard from
  // signed-out visitors instead of flashing the shell.
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)] p-6">
        <p className="text-sm font-semibold text-[var(--color-charcoal)]/75" role="status">
          Redirecting to sign in...
        </p>
      </main>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title={title}>
      {children}
    </DashboardLayout>
  );
}
