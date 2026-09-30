"use client";

import { CustomerAuthGate } from "@/features/customer/CustomerAuthGate";
import { CUSTOMER_NAV } from "./nav";

export default function CustomerLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <CustomerAuthGate navItems={CUSTOMER_NAV} title="Customer Dashboard">
      {children}
    </CustomerAuthGate>
  );
}
