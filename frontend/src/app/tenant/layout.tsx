"use client";

import { TenantSidebar } from "@/components/tenant/sidebar";
import { usePathname } from "next/navigation";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/tenant/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      <TenantSidebar />
      <main className="flex-1 overflow-y-auto p-10">
        {children}
      </main>
    </div>
  );
}
