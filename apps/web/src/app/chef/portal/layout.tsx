"use client";

import { AuthProvider } from "@/features/auth/AuthContext";
import { ChefPolicyGate } from "@/features/platform/ChefPolicyGate";
import { CHEF_NAV } from "./nav";

export default function ChefPortalLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChefPolicyGate navItems={CHEF_NAV}>{children}</ChefPolicyGate>
    </AuthProvider>
  );
}
