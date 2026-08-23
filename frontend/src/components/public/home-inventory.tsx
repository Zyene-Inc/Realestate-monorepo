"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ListingPreview } from "@/components/public/listing-rail";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FeaturedAreas,
  InventorySection,
  type Area,
} from "@/components/public/home-inventory-sections";
import { api } from "@/lib/api";
import { rentalPrice, type RentalProperty } from "@/lib/rental-properties";
import { formatCurrency, type SaleListing } from "@/lib/sale-listings";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const rentalFallbacks = [
  "/images/coach-johnson/missouri-brick-rental.webp",
  "/images/coach-johnson/missouri-craftsman.webp",
  "/images/coach-johnson/missouri-home-interior.webp",
];

function listedDate(value?: string | null, prefix = "Listed") {
  if (!value) return "Recently added";
  return `${prefix} ${dateFormatter.format(new Date(value))}`;
}

function salePreview(listing: SaleListing): ListingPreview {
  const sold = listing.status === "sold";
  return {
    id: listing.id,
    kind: "sale",
    name: listing.name,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    image: listing.photos[0] || "/images/coach-johnson/missouri-craftsman.webp",
    imageAlt: `${listing.name} exterior`,
    href: `/properties/${listing.id}`,
    availability: sold ? "sold" : "available",
    price: formatCurrency(listing.price),
    dateLabel: listedDate(listing.reviewedAt || listing.updatedAt),
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    squareFeet: listing.squareFeet,
  };
}

function rentalPreview(
  property: RentalProperty,
  index: number,
): ListingPreview {
  const unit = property.units[0];
  const price = rentalPrice(property);
  const rented = property.status === "rented";
  return {
    id: property.id,
    kind: "rental",
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    image:
      property.photos[0] || rentalFallbacks[index % rentalFallbacks.length],
    imageAlt: property.photos[0]
      ? `${property.name} rental property`
      : `Representative Missouri home for ${property.name}`,
    href: `/rentals/${property.id}`,
    availability: rented ? "rented" : "available",
    price:
      price == null
        ? rented
          ? "Rental completed"
          : "Contact for availability"
        : `${rented ? "Last offered at" : "From"} ${formatCurrency(price)} per month`,
    dateLabel: listedDate(property.updatedAt, "Updated"),
    bedrooms: unit?.bedrooms ?? property.bedrooms,
    bathrooms: unit?.bathrooms ?? property.bathrooms,
    squareFeet: unit?.squareFeet ?? property.squareFeet,
  };
}

function salePreviews(
  listings: SaleListing[],
  selectedArea: string | null,
  completed: boolean,
) {
  const previews: ListingPreview[] = [];
  for (const listing of listings) {
    const matchesCompletion = (listing.status === "sold") === completed;
    const matchesArea =
      !selectedArea || `${listing.city}, ${listing.state}` === selectedArea;
    if (matchesCompletion && matchesArea) previews.push(salePreview(listing));
    if (previews.length === 8) break;
  }
  return previews;
}

function rentalPreviews(
  properties: RentalProperty[],
  selectedArea: string | null,
  completed: boolean,
) {
  const previews: ListingPreview[] = [];
  for (const [index, property] of properties.entries()) {
    const matchesCompletion = (property.status === "rented") === completed;
    const matchesArea =
      !selectedArea || `${property.city}, ${property.state}` === selectedArea;
    if (matchesCompletion && matchesArea) {
      previews.push(rentalPreview(property, index));
    }
    if (previews.length === 8) break;
  }
  return previews;
}

export function HomeInventory() {
  const [sales, setSales] = useState<SaleListing[]>([]);
  const [rentals, setRentals] = useState<RentalProperty[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api.get("/public/sale-listings") as Promise<SaleListing[]>,
      api.get("/public/rental-properties") as Promise<RentalProperty[]>,
    ]).then(([saleResult, rentalResult]) => {
      if (cancelled) return;
      if (saleResult.status === "fulfilled") setSales(saleResult.value);
      if (rentalResult.status === "fulfilled") setRentals(rentalResult.value);
      setStatus(
        saleResult.status === "rejected" && rentalResult.status === "rejected"
          ? "error"
          : "ready",
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const areas = useMemo(() => {
    const values = new Map<string, Area>();
    for (const listing of sales) {
      const key = `${listing.city}, ${listing.state}`;
      const area = values.get(key) || {
        key,
        city: listing.city,
        state: listing.state,
        saleCount: 0,
        rentalCount: 0,
        completedCount: 0,
      };
      if (listing.status === "sold") area.completedCount += 1;
      else area.saleCount += 1;
      values.set(key, area);
    }
    for (const property of rentals) {
      const key = `${property.city}, ${property.state}`;
      const area = values.get(key) || {
        key,
        city: property.city,
        state: property.state,
        saleCount: 0,
        rentalCount: 0,
        completedCount: 0,
      };
      if (property.status === "rented") area.completedCount += 1;
      else area.rentalCount += 1;
      values.set(key, area);
    }
    return Array.from(values.values()).sort(
      (a, b) =>
        b.saleCount +
        b.rentalCount +
        b.completedCount -
        (a.saleCount + a.rentalCount + a.completedCount),
    );
  }, [rentals, sales]);

  const visibleSales = salePreviews(sales, selectedArea, false);
  const visibleRentals = rentalPreviews(rentals, selectedArea, false);
  const completedListings = [
    ...salePreviews(sales, selectedArea, true),
    ...rentalPreviews(rentals, selectedArea, true),
  ].slice(0, 8);
  const activeArea = areas.find((area) => area.key === selectedArea) || null;

  function selectArea(area: string) {
    setSelectedArea(area);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    document
      .getElementById("featured-areas")
      ?.scrollIntoView({ behavior, block: "start" });
  }

  if (status === "loading") return <InventoryLoading />;

  if (status === "error") {
    return (
      <section className="border-y border-border bg-card py-20 sm:py-24">
        <div className="public-container flex flex-col items-start">
          <Building2
            className="size-11 text-primary"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
            Current listings are reconnecting.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            The property feed is briefly unavailable. Tell us what you are
            looking for and the team can help directly.
          </p>
          <Link
            href="/contact"
            transitionTypes={["nav-forward"]}
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
          >
            Contact the property team{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <InventorySection
        id="for-sale"
        bordered
        eyebrow="Latest approved homes"
        title="Just listed for sale."
        description="Fresh properties from approved local agents, reviewed before they reach the public collection."
        linkHref="/properties"
        linkLabel="Discover all listings"
        listings={visibleSales}
        emptyMessage={
          selectedArea
            ? `No approved sale listings are published in ${selectedArea} right now.`
            : "New sale listings are in review. Approved homes will appear here automatically."
        }
        onAreaSelect={selectArea}
        ariaLabel="sale listings"
      />
      <InventorySection
        id="rentals"
        eyebrow="Homes for rent"
        title="Rent with a local team behind you."
        description="Published rental properties with clear addresses, current availability, and a direct path to the management team."
        linkHref="/contact?intent=rent"
        linkLabel="Ask about a rental"
        listings={visibleRentals}
        emptyMessage={
          selectedArea
            ? `No published rentals are available in ${selectedArea} right now.`
            : "Rental availability is being updated. Contact the team to share what you need."
        }
        onAreaSelect={selectArea}
        ariaLabel="rental properties"
      />
      <InventorySection
        id="recent-results"
        bordered
        eyebrow="Completed properties"
        title="Recently sold and rented."
        description="Completed homes stay visible as part of the property record, with their availability stated clearly."
        linkHref="/contact"
        linkLabel="Work with our team"
        listings={completedListings}
        emptyMessage={
          selectedArea
            ? `No completed properties are recorded in ${selectedArea} yet.`
            : "Sold and rented property profiles will remain visible here as transactions are completed."
        }
        onAreaSelect={selectArea}
        ariaLabel="completed properties"
      />
      <FeaturedAreas
        areas={areas}
        activeArea={activeArea}
        selectedArea={selectedArea}
        setSelectedArea={setSelectedArea}
        propertyCount={sales.length + rentals.length}
      />
    </>
  );
}

function InventoryLoading() {
  return (
    <section
      className="border-y border-border bg-card py-20 sm:py-28"
      aria-label="Loading current listings"
    >
      <div className="public-container">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-12 w-full max-w-lg" />
        <div className="mt-10 grid grid-cols-[repeat(3,minmax(18rem,1fr))] gap-5 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <Skeleton className="aspect-[4/3] rounded-[1.25rem]" />
              <Skeleton className="mt-4 h-7 w-3/4" />
              <Skeleton className="mt-3 h-5 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
