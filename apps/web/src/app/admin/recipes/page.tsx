"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type AuthenticatedUser } from "@/features/auth/api/authClient";
import { AdminRecipeManager } from "@/features/platform/AdminRecipeManager";

export default function AdminRecipesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) throw new Error("Not authenticated");
        if (!cancelled) setUser(currentUser);
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
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-[var(--color-charcoal)]/50">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.roles.includes("ADMIN");

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-8 text-center">
        <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Access Denied</h1>
        <p className="mt-2 text-[var(--color-charcoal)]/60">
          Recipe management is only available to administrators.
        </p>
      </div>
    );
  }

  return <AdminRecipeManager />;
}
