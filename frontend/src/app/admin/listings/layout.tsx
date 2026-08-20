import { SalesRouteGuard } from "@/components/admin/sales-route-guard";

export default function ListingReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesRouteGuard>{children}</SalesRouteGuard>;
}
