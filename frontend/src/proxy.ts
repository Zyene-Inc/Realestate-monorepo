import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_ORIGINS,
  isLocalOrPreviewHostname,
  portalForHostname,
  type Portal,
} from "@/lib/portal-domains";

const salesPaths = [
  "/admin/sales",
  "/admin/agents",
  "/admin/listings",
  "/admin/inquiries",
];

const rentalPaths = [
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
];

const sharedAdminPaths = ["/admin/login", "/admin/reports", "/admin/settings"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function canonicalPortalForPath(pathname: string): Portal | null {
  if (pathname === "/agent" || pathname.startsWith("/agent/")) return "agent";
  if (pathname === "/tenant" || pathname.startsWith("/tenant/")) return "tenant";
  if (startsWithAny(pathname, salesPaths)) return "propertiesAdmin";
  if (startsWithAny(pathname, rentalPaths)) return "rentalAdmin";
  if (pathname === "/admin" || startsWithAny(pathname, sharedAdminPaths)) {
    return "superAdmin";
  }
  return null;
}

function portalAllowsPath(portal: Portal, pathname: string) {
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

function redirectToPortal(request: NextRequest, portal: Portal, pathname: string) {
  const destination = new URL(pathname, `${PORTAL_ORIGINS[portal]}/`);
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination);
}

export function proxy(request: NextRequest) {
  const hostname = (
    request.headers.get("host") || request.nextUrl.hostname
  ).split(",")[0];
  if (isLocalOrPreviewHostname(hostname)) return NextResponse.next();

  const portal = portalForHostname(hostname);
  if (!portal) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/" && portal === "tenant") {
    return redirectToPortal(request, "tenant", "/tenant/login");
  }
  if (
    pathname === "/" &&
    ["propertiesAdmin", "rentalAdmin", "superAdmin"].includes(portal)
  ) {
    return redirectToPortal(request, portal, "/admin/login");
  }

  if (portalAllowsPath(portal, pathname)) return NextResponse.next();

  const canonicalPortal = canonicalPortalForPath(pathname);
  if (canonicalPortal) {
    return redirectToPortal(request, canonicalPortal, pathname);
  }

  return redirectToPortal(request, "public", pathname);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
