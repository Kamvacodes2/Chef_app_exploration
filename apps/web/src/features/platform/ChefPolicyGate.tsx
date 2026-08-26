"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import { SiteHeader } from "@/components/SiteHeader";
import { PolicyAcceptanceModal } from "@/components/ui/PolicyAcceptanceModal";
import { useAuth } from "@/features/auth/AuthContext";
import {
  fetchDocReuploadStatus,
  fetchPolicyStatus,
  type DocReuploadStatus,
  type PolicyStatusItem,
} from "@/features/platform/api/platformClient";
import { ChefDocReuploadScreen } from "@/features/platform/ChefDocReuploadScreen";

interface ChefPolicyGateProps {
  readonly children: ReactNode;
  readonly navItems: readonly NavItem[];
}

export function ChefPolicyGate({ children, navItems }: ChefPolicyGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [policyStatus, setPolicyStatus] = useState<PolicyStatusItem[] | null>(null);
  const [docReupload, setDocReupload] = useState<DocReuploadStatus | null>(null);
  const [docReuploadChecked, setDocReuploadChecked] = useState(false);
  const [confirmedPathname, setConfirmedPathname] = useState<string | null>(null);
  const [checkingPolicies, setCheckingPolicies] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const logoutInFlight = useRef(false);
  const isChef = user?.roles.includes("CHEF") ?? false;
  const isOperationalChef = isChef && user?.status === "ACTIVE";

  const requiredPending = useMemo(
    () => policyStatus?.filter((policy) => policy.required && !policy.accepted) ?? [],
    [policyStatus],
  );

  const pendingReupload = docReupload && !docReupload.termsAccepted ? docReupload : null;

  const fetchAndConfirmStatus = useCallback(async (): Promise<PolicyStatusItem[]> => {
    const requestId = ++requestSequence.current;
    setCheckingPolicies(true);
    setConfirmedPathname(null);
    setPolicyError(null);

    try {
      const nextStatus = await fetchPolicyStatus();
      if (requestId === requestSequence.current) {
        setPolicyStatus(nextStatus);
        setConfirmedPathname(pathname);
      }
      return nextStatus;
    } catch (caught) {
      if (requestId === requestSequence.current) {
        setPolicyError(
          caught instanceof Error ? caught.message : "Could not confirm your policy status.",
        );
      }
      throw caught;
    } finally {
      if (requestId === requestSequence.current) setCheckingPolicies(false);
    }
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    try {
      await logout();
    } catch {
      // AuthContext clears the local session even when the server request fails.
    } finally {
      router.replace("/login");
      logoutInFlight.current = false;
    }
  }, [logout, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isOperationalChef) return;

    void fetchAndConfirmStatus().catch(() => undefined);
    void fetchDocReuploadStatus()
      .then((status) => {
        setDocReupload(status);
        setDocReuploadChecked(true);
      })
      .catch(() => {
        setDocReuploadChecked(true);
      });
    return () => {
      requestSequence.current += 1;
    };
  }, [authLoading, fetchAndConfirmStatus, isAuthenticated, isOperationalChef, router]);
  useEffect(() => {
    if (authLoading || !isAuthenticated || !isOperationalChef) return;

    const confirmOnFocus = () => {
      void fetchAndConfirmStatus().catch(() => undefined);
    };
    window.addEventListener("focus", confirmOnFocus);
    return () => window.removeEventListener("focus", confirmOnFocus);
  }, [authLoading, fetchAndConfirmStatus, isAuthenticated, isOperationalChef]);

  if (authLoading) {
    return <GateFrame message="Checking your ChefMate session..." />;
  }

  if (!isAuthenticated || !user) {
    return (
      <GateFrame message="Sign in with your Chef account to continue.">
        <Link className="font-bold text-[var(--color-oxblood)] underline" href="/login">
          Go to sign in
        </Link>
      </GateFrame>
    );
  }

  if (!isChef) {
    return (
      <GateFrame message="This portal is available only to Chef accounts.">
        <GateActions onLogout={handleLogout} />
      </GateFrame>
    );
  }

  if (!isOperationalChef) {
    return (
      <GateFrame message="This Chef account is not active and cannot use operational tools.">
        <GateActions onLogout={handleLogout} />
      </GateFrame>
    );
  }

  if (!docReuploadChecked) {
    return <GateFrame message="Checking your compliance status..." />;
  }

  if (pendingReupload) {
    return (
      <>
        <SiteHeader variant="chefPortal" />
        <ChefDocReuploadScreen
          initialStatus={pendingReupload}
          onComplete={async () => {
            const status = await fetchDocReuploadStatus().catch(() => null);
            setDocReupload(status);
            await fetchAndConfirmStatus().catch(() => undefined);
          }}
        />
      </>
    );
  }

  if (requiredPending.length > 0) {
    return (
      <GateFrame message="Review the current required policies before using the Chef Portal.">
        <GateActions onLogout={handleLogout} />
        <PolicyAcceptanceModal
          onComplete={async () => {
            await fetchAndConfirmStatus();
          }}
          onLeave={handleLogout}
          policies={requiredPending}
        />
      </GateFrame>
    );
  }

  if (policyError) {
    return (
      <GateFrame message={policyError}>
        <button
          className="rounded-xl bg-[var(--color-oxblood)] px-4 py-2 text-sm font-bold text-white"
          onClick={() => void fetchAndConfirmStatus().catch(() => undefined)}
          type="button"
        >
          Retry policy check
        </button>
        <GateActions onLogout={handleLogout} />
      </GateFrame>
    );
  }

  if (checkingPolicies || policyStatus === null || confirmedPathname !== pathname) {
    return (
      <GateFrame message="Confirming your current policy status...">
        <GateActions onLogout={handleLogout} />
      </GateFrame>
    );
  }

  return (
    <DashboardLayout
      navItems={navItems}
      onLogout={() => void handleLogout()}
      title="Chef Portal"
      userDisplayName={user.displayName}
      userEmail={user.email}
    >
      {children}
    </DashboardLayout>
  );
}

function GateFrame({
  children,
  message,
}: {
  readonly children?: ReactNode;
  readonly message: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)] p-6">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <Link className="font-brand text-2xl text-[var(--color-oxblood)]" href="/">
          ChefMate
        </Link>
        <p className="mt-5 text-sm font-semibold text-[var(--color-charcoal)]/75" role="status">
          {message}
        </p>
        {children ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
        ) : null}
      </section>
    </main>
  );
}

function GateActions({ onLogout }: { readonly onLogout: () => void | Promise<void> }) {
  return (
    <>
      <Link
        className="rounded-xl border border-[var(--color-oxblood)] px-4 py-2 text-sm font-bold text-[var(--color-oxblood)]"
        href="/"
      >
        Leave portal
      </Link>
      <button
        className="rounded-xl px-4 py-2 text-sm font-bold text-red-700 underline-offset-4 hover:underline"
        onClick={() => void onLogout()}
        type="button"
      >
        Log out
      </button>
    </>
  );
}
