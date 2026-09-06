import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicSaleListing } from "@/lib/public-data";
import { absoluteSiteUrl, SITE_NAME } from "@/lib/seo";

type PropertyDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function descriptionForListing(listing: {
  name: string;
  address: string;
  city: string;
  state: string;
  description?: string | null;
}) {
  const fallback = `${listing.name} at ${listing.address} in ${listing.city}, ${listing.state}. View property details, photos, pricing, and contact Coach Johnson Realty.`;
  return (listing.description?.replace(/\s+/g, " ").trim() || fallback).slice(
    0,
    160,
  );
}

export async function generateMetadata({
  params,
}: Pick<PropertyDetailLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getPublicSaleListing(id);
  const canonical = absoluteSiteUrl(`/properties/${id}`);

  if (!listing) {
    return {
      title: "Property details",
      description: "View property details from Coach Johnson Realty.",
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const title = `${listing.name} for Sale in ${listing.city}, ${listing.state}`;
  const description = descriptionForListing(listing);
  const image = listing.photos[0];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: image ? [{ url: image, alt: `${listing.name} home` }] : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function PropertyDetailLayout({
  children,
  params,
}: PropertyDetailLayoutProps) {
  const { id } = await params;
  const listing = await getPublicSaleListing(id);
  const canonical = absoluteSiteUrl(`/properties/${id}`);

  return (
    <>
      {children}
      {listing ? (
        <>
          <BreadcrumbJsonLd
            items={[
              { name: "Home", path: "/" },
              { name: "Properties", path: "/properties" },
              { name: listing.name, path: `/properties/${listing.id}` },
            ]}
          />
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "RealEstateListing",
              "@id": `${canonical}#listing`,
              url: canonical,
              name: listing.name,
              description: descriptionForListing(listing),
              image: listing.photos,
              dateModified: listing.updatedAt,
              provider: { "@type": "RealEstateAgent", name: SITE_NAME },
              offers: {
                "@type": "Offer",
                url: canonical,
                price: Number(listing.price),
                priceCurrency: "USD",
                availability:
                  listing.status?.toLowerCase() === "sold"
                    ? "https://schema.org/SoldOut"
                    : "https://schema.org/InStock",
              },
              itemOffered: {
                "@type": "Residence",
                name: listing.name,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: listing.address,
                  addressLocality: listing.city,
                  addressRegion: listing.state,
                  postalCode: listing.zip,
                  addressCountry: "US",
                },
                numberOfBedrooms: listing.bedrooms ?? undefined,
                numberOfBathroomsTotal: listing.bathrooms ?? undefined,
                floorSize: listing.squareFeet
                  ? {
                      "@type": "QuantitativeValue",
                      value: listing.squareFeet,
                      unitCode: "FTK",
                    }
                  : undefined,
              },
            }}
          />
        </>
      ) : null}
    </>
  );
}
