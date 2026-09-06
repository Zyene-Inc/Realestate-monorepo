import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact Coach Johnson Realty",
  description:
    "Contact Coach Johnson Realty in Missouri for help buying, selling, renting, or managing a property. Send a message and reach the right person on our team.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]}
      />
      {children}
    </>
  );
}
