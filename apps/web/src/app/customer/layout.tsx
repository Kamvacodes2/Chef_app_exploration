"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CUSTOMER_NAV } from "./nav";

export default function CustomerLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={CUSTOMER_NAV} title="Customer Dashboard">
      {children}
    </DashboardLayout>
  );
}
