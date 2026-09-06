import { cache } from "react";
import type { RentalProperty } from "./rental-properties";
import type { SaleListing } from "./sale-listings";

function publicApiUrl(path: string) {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const base = backendUrl ? `${backendUrl}/api` : apiUrl;
  return base ? `${base}${path}` : null;
}

async function fetchPublicData<T>(path: string) {
  const url = publicApiUrl(path);
  if (!url) return null;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export const getPublicSaleListing = cache(async (id: string) =>
  fetchPublicData<SaleListing>(`/public/sale-listings/${id}`),
);

export const getPublicRentalProperty = cache(async (id: string) =>
  fetchPublicData<RentalProperty>(`/public/rental-properties/${id}`),
);
