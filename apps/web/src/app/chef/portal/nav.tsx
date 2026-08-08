import type { NavItem } from "@/components/layout/DashboardLayout";
import {
  IconCalendar,
  IconClock,
  IconDollarSign,
  IconLayoutDashboard,
  IconUser,
} from "@/components/ui/icons";

export const CHEF_NAV: readonly NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/chef/portal",
    icon: <IconLayoutDashboard width={18} height={18} />,
  },
  {
    id: "bookings",
    label: "My Bookings",
    path: "/chef/portal/bookings",
    icon: <IconCalendar width={18} height={18} />,
  },
  {
    id: "earnings",
    label: "Earnings",
    path: "/chef/portal/earnings",
    icon: <IconDollarSign width={18} height={18} />,
  },
  {
    id: "profile",
    label: "Profile",
    path: "/chef/portal/profile",
    icon: <IconUser width={18} height={18} />,
  },
];
