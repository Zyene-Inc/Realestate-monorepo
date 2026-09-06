import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Missouri Homes for Sale",
  description:
    "Browse reviewed homes for sale in Missouri from Coach Johnson Realty. See property details, photos, pricing, and a clear path to your next move with us.",
  path: "/properties",
});

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", path: "/" }, { name: "Properties", path: "/properties" }]}
      />
      {children}
    </>
  );
}
