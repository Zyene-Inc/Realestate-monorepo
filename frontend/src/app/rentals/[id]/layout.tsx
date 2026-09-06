import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicRentalProperty } from "@/lib/public-data";
import { absoluteSiteUrl, SITE_NAME } from "@/lib/seo";
import { rentalPrice, type RentalProperty } from "@/lib/rental-properties";

type RentalDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function metadataDescription(property: RentalProperty) {
  const fallback = `${property.name} at ${property.address} in ${property.city}, ${property.state}. View current rental details and contact Coach Johnson Realty about availability.`;
  const description = property.description?.replace(/\s+/g, " ").trim();
  return (description || fallback).slice(0, 160);
}

export async function generateMetadata({
  params,
}: Pick<RentalDetailLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const property = await getPublicRentalProperty(id);
  const canonical = absoluteSiteUrl(`/rentals/${id}`);

  if (!property) {
    return {
      title: "Rental property",
      description: "View rental availability from Coach Johnson Realty.",
      alternates: { canonical },
      robots: { index: false, follow: true },
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
  params,
}: RentalDetailLayoutProps) {
  return (
    <RentalDetailLayoutContent params={params}>
      {children}
    </RentalDetailLayoutContent>
  );
}

async function RentalDetailLayoutContent({
  children,
  params,
}: RentalDetailLayoutProps) {
  const { id } = await params;
  const property = await getPublicRentalProperty(id);
  const canonical = absoluteSiteUrl(`/rentals/${id}`);
  const price = property ? rentalPrice(property) : null;

  return (
    <>
      {children}
      {property ? (
        <>
          <BreadcrumbJsonLd
            items={[
              { name: "Home", path: "/" },
              { name: "Rentals", path: "/rentals" },
              { name: property.name, path: `/rentals/${property.id}` },
            ]}
          />
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "RealEstateListing",
              "@id": `${canonical}#listing`,
              url: canonical,
              name: property.name,
              description: metadataDescription(property),
              image: property.photos,
              dateModified: property.updatedAt,
              provider: { "@type": "RealEstateAgent", name: SITE_NAME },
              offers: price != null
                ? {
                    "@type": "Offer",
                    url: canonical,
                    price,
                    priceCurrency: "USD",
                    availability:
                      property.status === "rented"
                        ? "https://schema.org/SoldOut"
                        : "https://schema.org/InStock",
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      price,
                      priceCurrency: "USD",
                      unitText: "MONTH",
                    },
                  }
                : undefined,
              itemOffered: {
                "@type": "Residence",
                name: property.name,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: property.address,
                  addressLocality: property.city,
                  addressRegion: property.state,
                  postalCode: property.zip,
                  addressCountry: "US",
                },
                numberOfBedrooms: property.bedrooms ?? undefined,
                numberOfBathroomsTotal: property.bathrooms ?? undefined,
                floorSize: property.squareFeet
                  ? {
                      "@type": "QuantitativeValue",
                      value: property.squareFeet,
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
