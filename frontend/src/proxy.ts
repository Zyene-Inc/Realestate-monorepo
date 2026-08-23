import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_ORIGINS,
  entryPathForPortal,
  isLocalOrPreviewHostname,
  portalForHostname,
  type Portal,
} from "@/lib/portal-domains";
import { canonicalPortalForPath, portalAllowsPath } from "@/lib/portal-paths";

function redirectToPortal(
  request: NextRequest,
  portal: Portal,
  pathname: string,
) {
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
  if (pathname === "/" && portal !== "public") {
    return redirectToPortal(request, portal, entryPathForPortal(portal));
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
