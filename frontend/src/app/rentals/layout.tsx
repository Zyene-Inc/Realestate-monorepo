import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Missouri Homes for Rent",
  description:
    "View current Missouri rental homes managed by Coach Johnson Realty. Check availability, rent, property details, and the next step for local renters today.",
  path: "/rentals",
});

export default function RentalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", path: "/" }, { name: "Rentals", path: "/rentals" }]}
      />
      {children}
    </>
  );
}
