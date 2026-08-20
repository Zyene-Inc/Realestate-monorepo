"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAuth } from "@/context/auth-context";
import { routeForUser } from "@/lib/auth-routing";

export function AgentPortalShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const approved =
    user?.role === "AGENT" && user?.agentProfile?.accountStatus === "APPROVED";

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/");
    else if (!approved) router.replace(routeForUser(user));
  }, [approved, isLoading, router, user]);

  if (isLoading || !approved) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking agent access…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/agent/listings">
              <Logo className="h-9" />
            </Link>
            <nav className="hidden items-center gap-5 text-sm font-semibold md:flex">
              <Link href="/agent/listings" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Listings
              </Link>
              <Link href="/agent/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Company settings
              </Link>
              <Link href="/agent/inquiries" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Buyer inquiries
              </Link>
              <Link
                href="/agent/status"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <ShieldCheck className="h-4 w-4" /> Company status
              </Link>
            </nav>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
