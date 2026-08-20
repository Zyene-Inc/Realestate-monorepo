"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  FileText,
  CreditCard,
  Wrench,
  UserSquare2,
  MessageSquare,
  Megaphone,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  ClipboardCheck,
  ListChecks,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useAuth } from "@/context/auth-context";

const items = [
  {
    title: "Sales Dashboard",
    icon: LayoutDashboard,
    href: "/admin/sales",
    area: "sales",
  },
  {
    title: "Agent Approvals",
    icon: ClipboardCheck,
    href: "/admin/agents",
    area: "sales",
  },
  {
    title: "Listing Reviews",
    icon: ListChecks,
    href: "/admin/listings",
    area: "sales",
  },
  {
    title: "Inquiry Oversight",
    icon: MessagesSquare,
    href: "/admin/inquiries",
    area: "sales",
  },
  {
    title: "Rental Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    area: "rent",
  },
  {
    title: "Properties",
    icon: Building2,
    href: "/admin/properties",
    area: "rent",
  },
  { title: "Units", icon: DoorOpen, href: "/admin/units", area: "rent" },
  { title: "Tenants", icon: Users, href: "/admin/tenants", area: "rent" },
  { title: "Leases", icon: FileText, href: "/admin/leases", area: "rent" },
  {
    title: "Payments",
    icon: CreditCard,
    href: "/admin/payments",
    area: "rent",
  },
  {
    title: "Maintenance",
    icon: Wrench,
    href: "/admin/maintenance",
    area: "rent",
  },
  { title: "Vendors", icon: UserSquare2, href: "/admin/vendors", area: "rent" },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/admin/messages",
    area: "rent",
  },
  {
    title: "Announcements",
    icon: Megaphone,
    href: "/admin/announcements",
    area: "rent",
  },
  { title: "Reports", icon: BarChart3, href: "/admin/reports" },
  { title: "Settings", icon: Settings, href: "/admin/settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.email?.substring(0, 2).toUpperCase() || "AD";
  const visibleItems = items.filter((item) => {
    if (user?.role === "SALES_ADMIN") return item.area !== "rent";
    if (user?.role === "TENANT_ADMIN") return item.area !== "sales";
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-72 transition-all">
      <div className="p-8">
        <Logo className="h-10 w-auto" />
      </div>

      <div className="px-4 py-2 flex-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-4 font-heading">
          {user?.role === "SALES_ADMIN"
            ? "Buy / Sell Portal"
            : user?.role === "TENANT_ADMIN"
              ? "Rental Management"
              : "Main Administration"}
        </div>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative",
                  isActive
                    ? "text-primary-foreground bg-primary shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="flex-1 font-heading">{item.title}</span>
                {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="p-3 bg-secondary/50 rounded-2xl border border-border group hover:border-accent/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm font-heading shadow-md shadow-primary/20">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-foreground truncate font-heading">
                {user?.email?.split("@")[0] || "Admin User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-bold font-heading">
                {user?.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : user?.role === "SALES_ADMIN"
                    ? "Sales Admin"
                    : "Tenant Admin"}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
