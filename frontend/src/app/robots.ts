import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/images/"],
        disallow: [
          "/admin/",
          "/agent/",
          "/tenant/",
          "/auth/",
          "/api/",
          "/rentals/applications/",
          "/rentals/*/apply",
        ],
      },
    ],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
    host: absoluteSiteUrl("/"),
  };
}
