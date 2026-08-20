import {
  canonicalUrlForUser,
  isLocalOrPreviewHostname,
  pathForUser,
  type PortalUser,
} from "@/lib/portal-domains";

type Router = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

export function routeForUser(user: PortalUser) {
  if (
    typeof window === "undefined" ||
    isLocalOrPreviewHostname(window.location.hostname)
  ) {
    return pathForUser(user);
  }

  return canonicalUrlForUser(user);
}

export function navigateToUserPortal(
  router: Router,
  user: PortalUser,
  mode: "push" | "replace" = "push",
) {
  const destination = routeForUser(user);
  if (typeof window !== "undefined" && destination.startsWith("http")) {
    const target = new URL(destination);
    if (target.origin !== window.location.origin) {
      if (mode === "replace") window.location.replace(destination);
      else window.location.assign(destination);
      return;
    }
    router[mode](`${target.pathname}${target.search}${target.hash}`);
    return;
  }
  router[mode](destination);
}
