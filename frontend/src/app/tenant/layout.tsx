"use client";

import { TenantSidebar } from "@/components/tenant/sidebar";
import { useAuth } from "@/context/auth-context";
import { navigateToUserPortal } from "@/lib/auth-routing";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isLoginPage = pathname === "/tenant/login";

  useEffect(() => {
    if (isLoading || isLoginPage) return;
    if (!user) router.replace("/tenant/login");
    else if (user.role !== "TENANT") {
      navigateToUserPortal(router, user, "replace");
    }
  }, [isLoading, isLoginPage, router, user]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !user || user.role !== "TENANT") {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking tenant access…
      </main>
    );
  }

  return (
    <div className="portal-shell min-h-[100dvh] bg-background lg:flex">
      <TenantSidebar />
      <main id="main-content" className="portal-main" data-portal-main>
        {children}
      </main>
    </div>
  );
}
