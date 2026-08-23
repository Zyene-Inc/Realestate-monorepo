import assert from "node:assert/strict";
import {
  PORTAL_ORIGINS,
  canonicalUrlForUser,
  entryPathForPortal,
  isLocalOrPreviewHostname,
  portalForHostname,
  sharedAuthCookieDomain,
} from "../src/lib/portal-domains.ts";
import {
  canonicalPortalForPath,
  portalAllowsPath,
} from "../src/lib/portal-paths.ts";

assert.equal(portalForHostname("agents.coachjohnsonrealty.com"), "agent");
assert.equal(
  portalForHostname("properties-admin.coachjohnsonrealty.com"),
  "propertiesAdmin",
);
assert.equal(
  portalForHostname("rental-admin.coachjohnsonrealty.com"),
  "rentalAdmin",
);
assert.equal(portalForHostname("tenant.coachjohnsonrealty.com"), "tenant");
assert.equal(portalForHostname("admin.coachjohnsonrealty.com"), "superAdmin");
assert.equal(portalForHostname("coachjohnsonrealty.com"), "public");
assert.equal(portalForHostname("unknown.example.com"), null);

assert.equal(entryPathForPortal("public"), "/");
assert.equal(entryPathForPortal("agent"), "/agent/login");
assert.equal(entryPathForPortal("tenant"), "/tenant/login");
assert.equal(entryPathForPortal("propertiesAdmin"), "/admin/login");
assert.equal(entryPathForPortal("rentalAdmin"), "/admin/login");
assert.equal(entryPathForPortal("superAdmin"), "/admin/login");

assert.equal(isLocalOrPreviewHostname("localhost:3000"), true);
assert.equal(isLocalOrPreviewHostname("::1"), true);
assert.equal(isLocalOrPreviewHostname("[::1]:3000"), true);
assert.equal(isLocalOrPreviewHostname("branch.vercel.app"), true);
assert.equal(
  sharedAuthCookieDomain("agents.coachjohnsonrealty.com"),
  ".coachjohnsonrealty.com",
);
assert.equal(sharedAuthCookieDomain("localhost"), undefined);

assert.equal(
  canonicalUrlForUser({
    role: "AGENT",
    agentProfile: { accountStatus: "APPROVED" },
  }),
  `${PORTAL_ORIGINS.agent}/agent/listings`,
);
assert.equal(
  canonicalUrlForUser({
    role: "AGENT",
    agentProfile: { accountStatus: "PENDING" },
  }),
  `${PORTAL_ORIGINS.agent}/agent/status`,
);
assert.equal(
  canonicalUrlForUser({ role: "SALES_ADMIN" }),
  `${PORTAL_ORIGINS.propertiesAdmin}/admin/sales`,
);
assert.equal(
  canonicalUrlForUser({ role: "TENANT_ADMIN" }),
  `${PORTAL_ORIGINS.rentalAdmin}/admin/dashboard`,
);
assert.equal(
  canonicalUrlForUser({ role: "TENANT" }),
  `${PORTAL_ORIGINS.tenant}/tenant/dashboard`,
);
assert.equal(
  canonicalUrlForUser({ role: "SUPER_ADMIN" }),
  `${PORTAL_ORIGINS.superAdmin}/admin/dashboard`,
);

assert.equal(canonicalPortalForPath("/admin/reports"), "superAdmin");
assert.equal(canonicalPortalForPath("/admin/reports/audit"), "superAdmin");
assert.equal(canonicalPortalForPath("/admin/emails"), "superAdmin");
assert.equal(portalAllowsPath("superAdmin", "/admin/reports"), true);
assert.equal(portalAllowsPath("public", "/admin/reports"), false);
assert.equal(portalAllowsPath("propertiesAdmin", "/admin/reports"), false);
assert.equal(portalAllowsPath("rentalAdmin", "/admin/reports"), false);

console.log("DOMAIN_ROUTING_VERIFIED");
