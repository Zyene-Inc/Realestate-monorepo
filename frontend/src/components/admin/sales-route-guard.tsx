"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { navigateToUserPortal } from "@/lib/auth-routing";

export function SalesRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const canAccess = Boolean(
    user && ["SUPER_ADMIN", "SALES_ADMIN"].includes(user.role),
  );

  useEffect(() => {
    if (!isLoading && user && !canAccess) {
      navigateToUserPortal(router, user, "replace");
    }
  }, [canAccess, isLoading, router, user]);

  if (isLoading || !canAccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Checking sales access…
      </div>
    );
  }
  return children;
}
