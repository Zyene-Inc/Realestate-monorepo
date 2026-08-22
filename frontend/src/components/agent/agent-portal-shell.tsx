"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, MessageSquare, Settings, ShieldCheck } from "lucide-react";
import { PortalSidebar, type PortalNavItem } from "@/components/portal/portal-sidebar";
import { useAuth } from "@/context/auth-context";
import { navigateToUserPortal } from "@/lib/auth-routing";

const items: PortalNavItem[] = [
  { title: "Listings", icon: Building2, href: "/agent/listings" },
  { title: "Buyer inquiries", icon: MessageSquare, href: "/agent/inquiries" },
  { title: "Company settings", icon: Settings, href: "/agent/settings" },
  { title: "Approval status", icon: ShieldCheck, href: "/agent/status" },
];

export function AgentPortalShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const approved = user?.role === "AGENT" && user?.agentProfile?.accountStatus === "APPROVED";

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/");
    else if (!approved) navigateToUserPortal(router, user, "replace");
  }, [approved, isLoading, router, user]);

  if (isLoading || !approved) return <main id="main-content" className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">Checking agent access…</main>;

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      <PortalSidebar items={items} portalName="Agent workspace" userName={user.agentProfile?.companyName || user.email.split("@")[0]} userRole="Approved agent company" initials={(user.agentProfile?.companyName || user.email).slice(0, 2).toUpperCase()} onLogout={logout} />
      <main id="main-content" className="portal-main" data-portal-main>{children}</main>
    </div>
  );
}
