"use client";

import {
  CreditCard,
  FileText,
  Files,
  History,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  User,
  Wrench,
} from "lucide-react";
import {
  PortalSidebar,
  type PortalNavItem,
} from "@/components/portal/portal-sidebar";
import { useAuth } from "@/context/auth-context";

const items: PortalNavItem[] = [
  { title: "Overview", icon: LayoutDashboard, href: "/tenant/dashboard" },
  { title: "Pay rent", icon: CreditCard, href: "/tenant/pay-rent" },
  { title: "Payment history", icon: History, href: "/tenant/payments" },
  { title: "Maintenance", icon: Wrench, href: "/tenant/maintenance" },
  { title: "Lease", icon: FileText, href: "/tenant/lease" },
  { title: "Documents", icon: Files, href: "/tenant/documents" },
  { title: "Messages", icon: MessageSquare, href: "/tenant/messages" },
  { title: "Announcements", icon: Megaphone, href: "/tenant/announcements" },
  { title: "Profile", icon: User, href: "/tenant/profile" },
];

export function TenantSidebar() {
  const { user, logout } = useAuth();
  return (
    <PortalSidebar
      items={items}
      portalName="Resident portal"
      userName={user?.email?.split("@")[0] || "Resident"}
      userRole="Tenant account"
      initials={user?.email?.slice(0, 2).toUpperCase() || "RE"}
      onLogout={logout}
    />
  );
}
