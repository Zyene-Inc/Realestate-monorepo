import type { Portal } from "@/lib/portal-domains";

const salesPaths = [
  "/admin/sales",
  "/admin/agents",
  "/admin/listings",
  "/admin/inquiries",
  "/admin/leads",
];

const rentalPaths = [
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
];

const superAdminPaths = ["/admin/reports", "/admin/emails"];
const sharedAdminPaths = ["/admin/login", "/admin/settings"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canonicalPortalForPath(pathname: string): Portal | null {
  if (pathname === "/agent" || pathname.startsWith("/agent/")) return "agent";
  if (pathname === "/tenant" || pathname.startsWith("/tenant/")) {
    return "tenant";
  }
  if (startsWithAny(pathname, salesPaths)) return "propertiesAdmin";
  if (startsWithAny(pathname, rentalPaths)) return "rentalAdmin";
  if (startsWithAny(pathname, superAdminPaths)) return "superAdmin";
  if (pathname === "/admin" || startsWithAny(pathname, sharedAdminPaths)) {
    return "superAdmin";
  }
  return null;
}

export function portalAllowsPath(portal: Portal, pathname: string) {
  if (pathname.startsWith("/auth/")) return true;
  if (portal === "public") return canonicalPortalForPath(pathname) === null;
  if (portal === "superAdmin") return pathname.startsWith("/admin");
  if (portal === "agent") {
    return pathname === "/" || pathname.startsWith("/agent");
  }
  if (portal === "tenant") return pathname.startsWith("/tenant");
  if (portal === "propertiesAdmin") {
    return (
      startsWithAny(pathname, salesPaths) ||
      startsWithAny(pathname, sharedAdminPaths)
    );
  }
  return (
    startsWithAny(pathname, rentalPaths) ||
    startsWithAny(pathname, sharedAdminPaths)
  );
}
