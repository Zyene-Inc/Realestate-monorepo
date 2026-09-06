import { JsonLd } from "./json-ld";
import { absoluteSiteUrl } from "@/lib/seo";

type Breadcrumb = {
  name: string;
  path: string;
};

export function BreadcrumbJsonLd({ items }: { items: Breadcrumb[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteSiteUrl(item.path),
        })),
      }}
    />
  );
}
