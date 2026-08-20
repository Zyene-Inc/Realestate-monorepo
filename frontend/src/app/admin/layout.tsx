"use client";

import { AdminSidebar } from "@/components/admin/sidebar";
import { useAuth } from "@/context/auth-context";
import { routeForUser } from "@/lib/auth-routing";
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
  const isAdmin = ["SUPER_ADMIN", "SALES_ADMIN", "TENANT_ADMIN"].includes(
    user?.role,
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
    "/admin/maintenance",
    "/admin/vendors",
    "/admin/messages",
    "/admin/announcements",
  ].some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return;
    if (isLogin) return;
    if (!user) router.replace("/admin/login");
    else if (!isAdmin) router.replace(routeForUser(user));
    else if (user.role === "SALES_ADMIN" && rentalRoute)
      router.replace("/admin/sales");
    else if (user.role === "TENANT_ADMIN" && salesRoute)
      router.replace("/admin/dashboard");
  }, [isAdmin, isLoading, isLogin, rentalRoute, router, salesRoute, user]);

  if (isLogin) return children;

  const wrongVertical =
    (user?.role === "SALES_ADMIN" && rentalRoute) ||
    (user?.role === "TENANT_ADMIN" && salesRoute);

  if (isLoading || !user || !isAdmin || wrongVertical) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-10">{children}</main>
    </div>
  );
}
