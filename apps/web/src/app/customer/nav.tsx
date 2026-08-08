import type { NavItem } from "@/components/layout/DashboardLayout";
import { IconCalendar, IconLayoutDashboard, IconUser } from "@/components/ui/icons";

export const CUSTOMER_NAV: readonly NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/customer/dashboard",
    icon: <IconLayoutDashboard width={18} height={18} />,
  },
  {
    id: "bookings",
    label: "My Bookings",
    path: "/customer/bookings",
    icon: <IconCalendar width={18} height={18} />,
  },
  {
    id: "profile",
    label: "Profile",
    path: "/customer/profile",
    icon: <IconUser width={18} height={18} />,
  },
];
