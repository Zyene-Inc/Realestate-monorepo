"use client";

import {
  ClipboardCheck,
  CreditCard,
  FileText,
  Files,
  History,
  LayoutDashboard,
  Repeat2,
  Megaphone,
  MessageSquare,
  User,
  Wrench,
} from "lucide-react";
import {
  PortalSidebar,
  type PortalNavItem,
} from "@/components/portal/portal-sidebar";
import type { ProductTourStep } from "@/components/portal/product-tour";
import { useAuth } from "@/context/auth-context";

const items: PortalNavItem[] = [
  { title: "Overview", icon: LayoutDashboard, href: "/tenant/dashboard" },
  { title: "Pay rent", icon: CreditCard, href: "/tenant/pay-rent" },
  { title: "Payment history", icon: History, href: "/tenant/payments" },
  { title: "Maintenance", icon: Wrench, href: "/tenant/maintenance" },
  { title: "Lease", icon: FileText, href: "/tenant/lease" },
  {
    title: "Renewal & move-out",
    icon: Repeat2,
    href: "/tenant/lease-lifecycle",
  },
  { title: "Move-in record", icon: ClipboardCheck, href: "/tenant/move-in" },
  { title: "Documents", icon: Files, href: "/tenant/documents" },
  { title: "Messages", icon: MessageSquare, href: "/tenant/messages" },
  { title: "Announcements", icon: Megaphone, href: "/tenant/announcements" },
  { title: "Profile", icon: User, href: "/tenant/profile" },
];

const tourSteps: ProductTourStep[] = [
  {
    title: "Check your home overview",
    description:
      "Start here to see your current rent, lease dates, open maintenance requests, and recent announcements.",
    action: { label: "Open overview", href: "/tenant/dashboard" },
  },
  {
    title: "Pay rent when you are ready",
    description:
      "Rent is never charged automatically. Open Pay rent each time you want to make a tenant-initiated payment.",
    action: { label: "Open pay rent", href: "/tenant/pay-rent" },
  },
  {
    title: "Request maintenance with details",
    description:
      "Use Maintenance to describe the problem, include access instructions, and follow its progress from submission to completion.",
    action: { label: "Open maintenance", href: "/tenant/maintenance" },
  },
  {
    title: "Keep your records close",
    description:
      "Lease, Documents, Messages, Announcements, and Profile keep your rental records and communication in one place.",
    action: { label: "Open lease", href: "/tenant/lease" },
  },
  {
    title: "Review your move-in record",
    description:
      "When management sends it, review room conditions, add your observations or photos, and acknowledge the key handover.",
    action: { label: "Open move-in record", href: "/tenant/move-in" },
  },
  {
    title: "Plan renewal or move-out",
    description:
      "Review renewal signatures, submit notice, follow the final inspection, and keep your deposit statement and return proof.",
    action: {
      label: "Open renewal and move-out",
      href: "/tenant/lease-lifecycle",
    },
  },
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
      tourId={`tenant-${user?.id || "unknown"}`}
      tourSteps={tourSteps}
    />
  );
}
