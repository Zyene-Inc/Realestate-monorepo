export type Portal =
  | "public"
  | "agent"
  | "propertiesAdmin"
  | "rentalAdmin"
  | "tenant"
  | "superAdmin";

export type PortalUser =
  | {
      role?: string;
      agentProfile?: { accountStatus?: string } | null;
    }
  | null
  | undefined;

const rootDomain = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "coachjohnsonrealty.com"
)
  .trim()
  .toLowerCase()
  .replace(/^\./, "");

const ROOT_DOMAIN = rootDomain;

function verifiedPortalOrigin(value: string | undefined, expectedHost: string) {
  const fallback = `https://${expectedHost}`;
  if (!value) return fallback;
  try {
    const configured = new URL(value);
    return configured.protocol === "https:" &&
      configured.hostname.toLowerCase() === expectedHost
      ? configured.origin
      : fallback;
  } catch {
    return fallback;
  }
}

export const PORTAL_ORIGINS: Record<Portal, string> = {
  public: verifiedPortalOrigin(process.env.NEXT_PUBLIC_SITE_URL, rootDomain),
  agent: verifiedPortalOrigin(
    process.env.NEXT_PUBLIC_AGENT_PORTAL_URL,
    `agents.${rootDomain}`,
  ),
  propertiesAdmin: verifiedPortalOrigin(
    process.env.NEXT_PUBLIC_PROPERTIES_ADMIN_URL,
    `properties-admin.${rootDomain}`,
  ),
  rentalAdmin: verifiedPortalOrigin(
    process.env.NEXT_PUBLIC_RENTAL_ADMIN_URL,
    `rental-admin.${rootDomain}`,
  ),
  tenant: verifiedPortalOrigin(
    process.env.NEXT_PUBLIC_TENANT_PORTAL_URL,
    `tenant.${rootDomain}`,
  ),
  superAdmin: verifiedPortalOrigin(
    process.env.NEXT_PUBLIC_SUPER_ADMIN_URL,
    `admin.${rootDomain}`,
  ),
};

const portalHosts = Object.fromEntries(
  Object.entries(PORTAL_ORIGINS).map(([portal, origin]) => [
    new URL(origin).hostname.toLowerCase(),
    portal,
  ]),
) as Record<string, Portal>;

function hostnameWithoutPort(hostname: string) {
  const normalized = hostname.trim().toLowerCase().split(",")[0].trim();
  if (normalized === "::1") return normalized;
  if (normalized.startsWith("[")) {
    const closingBracket = normalized.indexOf("]");
    if (closingBracket > 0) return normalized.slice(1, closingBracket);
  }
  return normalized.split(":")[0];
}

export function isLocalOrPreviewHostname(hostname: string) {
  const normalized = hostnameWithoutPort(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".vercel.app")
  );
}

export function portalForHostname(hostname: string): Portal | null {
  return portalHosts[hostnameWithoutPort(hostname)] ?? null;
}

export function entryPathForPortal(portal: Portal) {
  if (portal === "agent") return "/agent/login";
  if (portal === "tenant") return "/tenant/login";
  if (
    portal === "propertiesAdmin" ||
    portal === "rentalAdmin" ||
    portal === "superAdmin"
  ) {
    return "/admin/login";
  }
  return "/";
}

function portalForRole(role?: string): Portal {
  if (role === "AGENT") return "agent";
  if (role === "SALES_ADMIN") return "propertiesAdmin";
  if (role === "TENANT_ADMIN") return "rentalAdmin";
  if (role === "TENANT") return "tenant";
  return "superAdmin";
}

export function pathForUser(user: PortalUser) {
  if (user?.role === "TENANT") return "/tenant/dashboard";
  if (user?.role === "AGENT") {
    return user.agentProfile?.accountStatus === "APPROVED"
      ? "/agent/listings"
      : "/agent/status";
  }
  if (user?.role === "SALES_ADMIN") return "/admin/sales";
  return "/admin/dashboard";
}

function portalUrl(portal: Portal, path = "/") {
  return new URL(path, `${PORTAL_ORIGINS[portal]}/`).toString();
}

export function canonicalUrlForUser(user: PortalUser) {
  return portalUrl(portalForRole(user?.role), pathForUser(user));
}

export function sharedAuthCookieDomain(hostname?: string) {
  if (!hostname || isLocalOrPreviewHostname(hostname)) return undefined;
  const normalized = hostnameWithoutPort(hostname);
  if (normalized === ROOT_DOMAIN || normalized.endsWith(`.${ROOT_DOMAIN}`)) {
    return `.${ROOT_DOMAIN}`;
  }
  return undefined;
}
