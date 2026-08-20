import { SalesRouteGuard } from "@/components/admin/sales-route-guard";

export default function AgentApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesRouteGuard>{children}</SalesRouteGuard>;
}
