import { SalesRouteGuard } from "@/components/admin/sales-route-guard";

export default function WebsiteLeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesRouteGuard>{children}</SalesRouteGuard>;
}
