import type { Metadata } from "next";
import type { RentalProperty } from "@/lib/rental-properties";

const publicSiteUrl = "https://coachjohnsonrealty.com";

type RentalDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

async function getRentalMetadata(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  try {
    const response = await fetch(`${apiUrl}/public/rental-properties/${id}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as RentalProperty;
  } catch {
    return null;
  }
}

function metadataDescription(property: RentalProperty) {
  const fallback = `${property.name} at ${property.address} in ${property.city}, ${property.state}. View current rental details and contact Coach Johnson Realty about availability.`;
  const description = property.description?.replace(/\s+/g, " ").trim();
  return (description || fallback).slice(0, 160);
}

export async function generateMetadata({
  params,
}: Pick<RentalDetailLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const property = await getRentalMetadata(id);
  const canonical = `${publicSiteUrl}/rentals/${id}`;

  if (!property) {
    return {
      title: "Rental property",
      description: "View rental availability from Coach Johnson Realty.",
      alternates: { canonical },
    };
  }

  const title = `${property.name} for Rent in ${property.city}, ${property.state}`;
  const description = metadataDescription(property);
  const image = property.photos[0];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: image ? [{ url: image, alt: `${property.name} rental home` }] : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default function RentalDetailLayout({
  children,
}: RentalDetailLayoutProps) {
  return children;
}
