"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCurrentUser, logout } from "@/features/auth/api/authClient";
import { ADMIN_NAV } from "./nav";

export default function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) throw new Error("Not authenticated");
        const roles: string[] = currentUser.roles;
        if (!roles.includes("ADMIN") && !roles.includes("SUPPORT")) {
          throw new Error("Not authorized");
        }
        if (!cancelled) {
          setAuthorized(true);
          setUserDisplayName(currentUser.displayName ?? "");
          setUserEmail(currentUser.email ?? "");
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    router.replace("/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)]">
        <p className="text-[var(--color-charcoal)]/50">Checking access...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="Admin Dashboard"
      userDisplayName={userDisplayName}
      userEmail={userEmail}
      onLogout={handleLogout}
    >
      {children}
    </DashboardLayout>
  );
}
