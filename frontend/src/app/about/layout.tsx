import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Coach Johnson Realty",
  description:
    "Learn how Coach Johnson Realty serves Missouri buyers, sellers, renters, and property owners with steady local judgment, clear systems, and consistent care.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]}
      />
      {children}
    </>
  );
}
