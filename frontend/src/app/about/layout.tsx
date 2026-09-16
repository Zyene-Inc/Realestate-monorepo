import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kansas City Community Investment",
  description:
    "Learn how Coach Johnson Realty invests in Kansas City neighborhoods through quality homes, steady property care, and long-term community ownership.",
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
