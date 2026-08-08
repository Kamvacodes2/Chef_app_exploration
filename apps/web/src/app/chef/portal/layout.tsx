"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CHEF_NAV } from "./nav";

export default function ChefPortalLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={CHEF_NAV} title="Chef Portal">
      {children}
    </DashboardLayout>
  );
}
