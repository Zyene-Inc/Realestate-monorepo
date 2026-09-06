import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/seo";
import type { RentalProperty } from "@/lib/rental-properties";
import type { SaleListing } from "@/lib/sale-listings";

const staticPages: MetadataRoute.Sitemap = [
  { url: absoluteSiteUrl("/"), changeFrequency: "weekly", priority: 1 },
  { url: absoluteSiteUrl("/properties"), changeFrequency: "daily", priority: 0.9 },
  { url: absoluteSiteUrl("/rentals"), changeFrequency: "daily", priority: 0.9 },
  { url: absoluteSiteUrl("/about"), changeFrequency: "monthly", priority: 0.7 },
  { url: absoluteSiteUrl("/contact"), changeFrequency: "monthly", priority: 0.8 },
];

function publicApiUrl(path: string) {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const base = backendUrl ? `${backendUrl}/api` : apiUrl;
  return base ? `${base}${path}` : null;
}

async function fetchJson<T>(path: string) {
  const url = publicApiUrl(path);
  if (!url) return null;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sales, rentals] = await Promise.all([
    fetchJson<SaleListing[]>("/public/sale-listings"),
    fetchJson<RentalProperty[]>("/public/rental-properties"),
  ]);

  const salePages = (sales ?? []).map((listing) => ({
    url: absoluteSiteUrl(`/properties/${listing.id}`),
    lastModified: listing.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const rentalPages = (rentals ?? []).map((property) => ({
    url: absoluteSiteUrl(`/rentals/${property.id}`),
    lastModified: property.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...salePages, ...rentalPages];
}
