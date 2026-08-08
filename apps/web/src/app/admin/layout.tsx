"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ADMIN_NAV } from "./nav";

export default function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Admin Dashboard">
      {children}
    </DashboardLayout>
  );
}
