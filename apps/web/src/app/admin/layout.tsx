"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ADMIN_NAV } from "./nav";

export default function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        const roles: string[] = data.data?.user?.roles ?? [];
        if (!roles.includes("ADMIN") && !roles.includes("SUPPORT")) {
          throw new Error("Not authorized");
        }
        if (!cancelled) setAuthorized(true);
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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-warm-cream)]">
        <p className="text-[var(--color-charcoal)]/50">Checking access...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Admin Dashboard">
      {children}
    </DashboardLayout>
  );
}
