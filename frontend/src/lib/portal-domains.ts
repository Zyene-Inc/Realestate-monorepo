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

export const ROOT_DOMAIN = rootDomain;

export const PORTAL_ORIGINS: Record<Portal, string> = {
  public:
    process.env.NEXT_PUBLIC_SITE_URL || `https://${rootDomain}`,
  agent:
    process.env.NEXT_PUBLIC_AGENT_PORTAL_URL ||
    `https://agents.${rootDomain}`,
  propertiesAdmin:
    process.env.NEXT_PUBLIC_PROPERTIES_ADMIN_URL ||
    `https://properties-admin.${rootDomain}`,
  rentalAdmin:
    process.env.NEXT_PUBLIC_RENTAL_ADMIN_URL ||
    `https://rental-admin.${rootDomain}`,
  tenant:
    process.env.NEXT_PUBLIC_TENANT_PORTAL_URL ||
    `https://tenant.${rootDomain}`,
  superAdmin:
    process.env.NEXT_PUBLIC_SUPER_ADMIN_URL ||
    `https://admin.${rootDomain}`,
};

const portalHosts = Object.fromEntries(
  Object.entries(PORTAL_ORIGINS).map(([portal, origin]) => [
    new URL(origin).hostname.toLowerCase(),
    portal,
  ]),
) as Record<string, Portal>;

export function hostnameWithoutPort(hostname: string) {
  return hostname.trim().toLowerCase().split(":")[0];
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

export function portalForRole(role?: string): Portal {
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

export function portalUrl(portal: Portal, path = "/") {
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
