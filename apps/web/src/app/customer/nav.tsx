import type { NavItem } from "@/components/layout/DashboardLayout";
import {
  IconCalendar,
  IconLayoutDashboard,
  IconMessageCircle,
  IconUser,
} from "@/components/ui/icons";
import { ChatBadge } from "@/features/chat/ChatBadge";

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
    id: "messages",
    label: "Messages",
    path: "/customer/messages",
    icon: <IconMessageCircle width={18} height={18} />,
    badge: <ChatBadge />,
  },
  {
    id: "profile",
    label: "Profile",
    path: "/customer/profile",
    icon: <IconUser width={18} height={18} />,
  },
];
