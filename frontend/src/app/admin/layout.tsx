"use client";

import { AdminSidebar } from "@/components/admin/sidebar";
import { useAuth } from "@/context/auth-context";
import { navigateToUserPortal } from "@/lib/auth-routing";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const isAdmin = Boolean(
    user && ["SUPER_ADMIN", "SALES_ADMIN", "TENANT_ADMIN"].includes(user.role),
  );
  const salesRoute =
    pathname.startsWith("/admin/sales") ||
    pathname.startsWith("/admin/agents") ||
    pathname.startsWith("/admin/listings") ||
    pathname.startsWith("/admin/inquiries");
  const rentalRoute = [
    "/admin/dashboard",
    "/admin/properties",
    "/admin/units",
    "/admin/tenants",
    "/admin/leases",
    "/admin/payments",
    "/admin/owners",
    "/admin/maintenance",
    "/admin/vendors",
    "/admin/messages",
    "/admin/announcements",
  ].some((route) => pathname.startsWith(route));
  const superRoute =
    pathname.startsWith("/admin/emails") ||
    pathname.startsWith("/admin/reports");

  useEffect(() => {
    if (isLoading) return;
    if (isLogin) return;
    if (!user) router.replace("/admin/login");
    else if (!isAdmin) navigateToUserPortal(router, user, "replace");
    else if (user.role === "SALES_ADMIN" && rentalRoute)
      navigateToUserPortal(router, user, "replace");
    else if (user.role === "TENANT_ADMIN" && salesRoute)
      navigateToUserPortal(router, user, "replace");
    else if (user.role !== "SUPER_ADMIN" && superRoute)
      navigateToUserPortal(router, user, "replace");
  }, [
    isAdmin,
    isLoading,
    isLogin,
    rentalRoute,
    router,
    salesRoute,
    superRoute,
    user,
  ]);

  if (isLogin) return children;

  const wrongVertical =
    (user?.role === "SALES_ADMIN" && rentalRoute) ||
    (user?.role === "TENANT_ADMIN" && salesRoute) ||
    (user?.role !== "SUPER_ADMIN" && superRoute);

  if (isLoading || !user || !isAdmin || wrongVertical) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      <AdminSidebar />
      <main id="main-content" className="portal-main" data-portal-main>
        {children}
      </main>
    </div>
  );
}
