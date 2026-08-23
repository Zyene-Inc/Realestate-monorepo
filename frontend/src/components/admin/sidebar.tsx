"use client";

import {
  BarChart3,
  Building2,
  ClipboardCheck,
  CreditCard,
  Landmark,
  DoorOpen,
  FileText,
  FileSignature,
  LayoutDashboard,
  ListChecks,
  MailCheck,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  ReceiptText,
  Settings,
  Users,
  UserSquare2,
  Wrench,
} from "lucide-react";
import {
  PortalSidebar,
  type PortalNavItem,
} from "@/components/portal/portal-sidebar";
import { useAuth } from "@/context/auth-context";

const items = [
  {
    title: "Sales overview",
    icon: LayoutDashboard,
    href: "/admin/sales",
    area: "sales",
    group: "Sales & listings",
    matchNested: false,
  },
  {
    title: "Agent approvals",
    icon: ClipboardCheck,
    href: "/admin/agents",
    area: "sales",
    group: "Sales & listings",
  },
  {
    title: "Listing reviews",
    icon: ListChecks,
    href: "/admin/listings",
    area: "sales",
    group: "Sales & listings",
  },
  {
    title: "Inquiry oversight",
    icon: MessagesSquare,
    href: "/admin/inquiries",
    area: "sales",
    group: "Sales & listings",
  },
  {
    title: "Website leads",
    icon: MailCheck,
    href: "/admin/leads",
    area: "sales",
    group: "Sales & listings",
  },
  {
    title: "Commission ledger",
    icon: ReceiptText,
    href: "/admin/sales/commissions",
    area: "sales",
    group: "Sales & listings",
  },
  {
    title: "Rental overview",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    area: "rent",
    group: "Rental portfolio",
  },
  {
    title: "Properties",
    icon: Building2,
    href: "/admin/properties",
    area: "rent",
    group: "Rental portfolio",
  },
  {
    title: "Units",
    icon: DoorOpen,
    href: "/admin/units",
    area: "rent",
    group: "Rental portfolio",
  },
  {
    title: "Property owners",
    icon: Landmark,
    href: "/admin/owners",
    area: "rent",
    group: "Rental portfolio",
  },
  {
    title: "Tenants",
    icon: Users,
    href: "/admin/tenants",
    area: "rent",
    group: "Residents & payments",
  },
  {
    title: "Leases",
    icon: FileText,
    href: "/admin/leases",
    area: "rent",
    group: "Residents & payments",
  },
  {
    title: "Payments",
    icon: CreditCard,
    href: "/admin/payments",
    area: "rent",
    group: "Residents & payments",
  },
  {
    title: "Maintenance",
    icon: Wrench,
    href: "/admin/maintenance",
    area: "rent",
    group: "Service & communication",
  },
  {
    title: "Vendors",
    icon: UserSquare2,
    href: "/admin/vendors",
    area: "rent",
    group: "Service & communication",
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/admin/messages",
    area: "rent",
    group: "Service & communication",
  },
  {
    title: "Announcements",
    icon: Megaphone,
    href: "/admin/announcements",
    area: "rent",
    group: "Service & communication",
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/admin/reports",
    area: "super",
    group: "Company tools",
  },
  {
    title: "E-signatures",
    icon: FileSignature,
    href: "/admin/e-signatures",
    group: "Company tools",
  },
  {
    title: "Email delivery",
    icon: MailCheck,
    href: "/admin/emails",
    area: "super",
    group: "Company tools",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/admin/settings",
    group: "System",
  },
];

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const visibleItems = items.filter((item) =>
    user?.role === "SALES_ADMIN"
      ? item.area !== "rent" && item.area !== "super"
      : user?.role === "TENANT_ADMIN"
        ? item.area !== "sales" && item.area !== "super"
        : true,
  ) as PortalNavItem[];
  const role =
    user?.role === "SUPER_ADMIN"
      ? "Super administrator"
      : user?.role === "SALES_ADMIN"
        ? "Sales administrator"
        : "Rental administrator";
  return (
    <PortalSidebar
      items={visibleItems}
      portalName={
        user?.role === "SALES_ADMIN"
          ? "Sales administration"
          : user?.role === "TENANT_ADMIN"
            ? "Rental administration"
            : "Company administration"
      }
      userName={user?.email?.split("@")[0] || "Administrator"}
      userRole={role}
      initials={user?.email?.slice(0, 2).toUpperCase() || "CJ"}
      onLogout={logout}
    />
  );
}
