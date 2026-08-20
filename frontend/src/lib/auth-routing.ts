type RoutableUser =
  | {
      role?: string;
      agentProfile?: { accountStatus?: string } | null;
    }
  | null
  | undefined;

export function routeForUser(user: RoutableUser) {
  if (user?.role === "TENANT") return "/tenant/dashboard";
  if (user?.role === "AGENT") {
    return user.agentProfile?.accountStatus === "APPROVED"
      ? "/agent/listings"
      : "/agent/status";
  }
  if (user?.role === "SALES_ADMIN") return "/admin/sales";
  return "/admin/dashboard";
}
