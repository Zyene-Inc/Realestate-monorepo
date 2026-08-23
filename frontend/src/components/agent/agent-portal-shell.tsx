"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileSignature,
  MessageSquare,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  PortalSidebar,
  type PortalNavItem,
} from "@/components/portal/portal-sidebar";
import type { ProductTourStep } from "@/components/portal/product-tour";
import { useAuth } from "@/context/auth-context";
import { navigateToUserPortal } from "@/lib/auth-routing";

const items: PortalNavItem[] = [
  { title: "Listings", icon: Building2, href: "/agent/listings" },
  { title: "Buyer inquiries", icon: MessageSquare, href: "/agent/inquiries" },
  { title: "Documents", icon: FileSignature, href: "/agent/documents" },
  { title: "Company settings", icon: Settings, href: "/agent/settings" },
  { title: "Approval status", icon: ShieldCheck, href: "/agent/status" },
];

const tourSteps: ProductTourStep[] = [
  {
    title: "Create and manage listings",
    description:
      "Listings is your working inventory. Save drafts as you prepare property details, photos, and documents.",
    action: { label: "Open listings", href: "/agent/listings" },
  },
  {
    title: "Submit listings for approval",
    description:
      "Submitted listings go to Johnson Realty for review. Only approved listings can appear on the public properties page.",
    action: { label: "Open listings", href: "/agent/listings" },
  },
  {
    title: "Respond to routed buyer inquiries",
    description:
      "Buyer inquiries belong here. Reply promptly, review read status, and keep the conversation focused on the selected property.",
    action: { label: "Open buyer inquiries", href: "/agent/inquiries" },
  },
  {
    title: "Keep company details current",
    description:
      "Documents and Company settings hold the records Johnson Realty uses to keep your company approved and active.",
    action: { label: "Open company settings", href: "/agent/settings" },
  },
];

export function AgentPortalShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const approved =
    user?.role === "AGENT" && user?.agentProfile?.accountStatus === "APPROVED";

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/agent/login");
    else if (!approved) navigateToUserPortal(router, user, "replace");
  }, [approved, isLoading, router, user]);

  if (isLoading || !approved)
    return (
      <main
        id="main-content"
        className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground"
      >
        Checking agent access…
      </main>
    );

  return (
    <div className="portal-shell min-h-[100dvh] bg-background lg:flex">
      <PortalSidebar
        items={items}
        portalName="Agent workspace"
        userName={user.agentProfile?.companyName || user.email.split("@")[0]}
        userRole="Approved agent company"
        initials={(user.agentProfile?.companyName || user.email)
          .slice(0, 2)
          .toUpperCase()}
        onLogout={logout}
        tourId={`agent-${user.id}`}
        tourSteps={tourSteps}
      />
      <main id="main-content" className="portal-main" data-portal-main>
        {children}
      </main>
    </div>
  );
}
