import { SalesRouteGuard } from "@/components/admin/sales-route-guard";

export default function InquiryOversightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesRouteGuard>{children}</SalesRouteGuard>;
}
