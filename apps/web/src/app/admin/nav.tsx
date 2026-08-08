import type { NavItem } from "@/components/layout/DashboardLayout";
import {
  IconBarChart2,
  IconCalendar,
  IconClipboardList,
  IconCreditCard,
  IconLayoutDashboard,
  IconMail,
  IconSparkles,
  IconUserCheck,
  IconUsers,
} from "@/components/ui/icons";

export const ADMIN_NAV: readonly NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/admin",
    icon: <IconLayoutDashboard width={18} height={18} />,
  },
  {
    id: "customers",
    label: "Customers",
    path: "/admin/customers",
    icon: <IconUsers width={18} height={18} />,
  },
  {
    id: "chefs",
    label: "Chefs",
    path: "/admin/chefs",
    icon: <IconUserCheck width={18} height={18} />,
  },
  {
    id: "applications",
    label: "Applications",
    path: "/admin/applications",
    icon: <IconClipboardList width={18} height={18} />,
  },
  {
    id: "bookings",
    label: "Bookings",
    path: "/admin/bookings",
    icon: <IconCalendar width={18} height={18} />,
  },
  {
    id: "comms",
    label: "Communications",
    path: "/admin/comms",
    icon: <IconMail width={18} height={18} />,
  },
  {
    id: "featured-meals",
    label: "Featured Meals",
    path: "/admin/featured-meals",
    icon: <IconSparkles width={18} height={18} />,
  },
];
