"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ListingRail,
  type ListingPreview,
} from "@/components/public/listing-rail";
import { Skeleton } from "@/components/ui/skeleton";
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

type Area = {
  key: string;
  city: string;
  state: string;
  saleCount: number;
  rentalCount: number;
  completedCount: number;
};

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

  const visibleSales = sales
    .filter(
      (listing) =>
        listing.status !== "sold" &&
        (!selectedArea || `${listing.city}, ${listing.state}` === selectedArea),
    )
    .slice(0, 8)
    .map(salePreview);
  const visibleRentals = rentals
    .filter(
      (property) =>
        property.status !== "rented" &&
        (!selectedArea ||
          `${property.city}, ${property.state}` === selectedArea),
    )
    .slice(0, 8)
    .map(rentalPreview);
  const completedListings = [
    ...sales.filter((listing) => listing.status === "sold").map(salePreview),
    ...rentals
      .filter((property) => property.status === "rented")
      .map(rentalPreview),
  ]
    .filter(
      (listing) =>
        !selectedArea || `${listing.city}, ${listing.state}` === selectedArea,
    )
    .slice(0, 8);
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
      <section
        id="for-sale"
        className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-28"
      >
        <div className="public-container mb-9 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">
              Latest approved homes
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Just listed for sale.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Fresh properties from approved local agents, reviewed before they
              reach the public collection.
            </p>
          </div>
          <Link
            href="/properties"
            transitionTypes={["nav-forward"]}
            className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
          >
            Discover all listings{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="ml-[max(1rem,calc((100vw-88rem)/2))]">
          <ListingRail
            listings={visibleSales}
            emptyMessage={
              selectedArea
                ? `No approved sale listings are published in ${selectedArea} right now.`
                : "New sale listings are in review. Approved homes will appear here automatically."
            }
            onAreaSelect={selectArea}
            ariaLabel="sale listings"
          />
        </div>
      </section>

      <section id="rentals" className="scroll-mt-24 py-20 sm:py-28">
        <div className="public-container mb-9 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">Homes for rent</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Rent with a local team behind you.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Published rental properties with clear addresses, current
              availability, and a direct path to the management team.
            </p>
          </div>
          <Link
            href="/contact?intent=rent"
            transitionTypes={["nav-forward"]}
            className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
          >
            Ask about a rental{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="ml-[max(1rem,calc((100vw-88rem)/2))]">
          <ListingRail
            listings={visibleRentals}
            emptyMessage={
              selectedArea
                ? `No published rentals are available in ${selectedArea} right now.`
                : "Rental availability is being updated. Contact the team to share what you need."
            }
            onAreaSelect={selectArea}
            ariaLabel="rental properties"
          />
        </div>
      </section>

      <section
        id="recent-results"
        className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-28"
      >
        <div className="public-container mb-9 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">
              Completed properties
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Recently sold and rented.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Completed homes stay visible as part of the property record, with
              their availability stated clearly.
            </p>
          </div>
          <Link
            href="/contact"
            transitionTypes={["nav-forward"]}
            className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
          >
            Work with our team{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="ml-[max(1rem,calc((100vw-88rem)/2))]">
          <ListingRail
            listings={completedListings}
            emptyMessage={
              selectedArea
                ? `No completed properties are recorded in ${selectedArea} yet.`
                : "Sold and rented property profiles will remain visible here as transactions are completed."
            }
            onAreaSelect={selectArea}
            ariaLabel="completed properties"
          />
        </div>
      </section>

      <section id="featured-areas" className="scroll-mt-24 py-20 sm:py-28">
        <div className="public-container grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch">
          <div className="relative min-h-[28rem] overflow-hidden rounded-[1.5rem] lg:min-h-[38rem]">
            <Image
              src="/images/coach-johnson/missouri-neighborhood.webp"
              alt="Established Missouri neighborhood with varied homes and mature trees"
              fill
              sizes="(min-width: 1024px) 54vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-border bg-background p-7 sm:p-10 lg:p-12">
            <div>
              <p className="text-sm font-semibold text-primary">
                Discover featured areas
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                Follow the addresses that shape our work.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Coverage is drawn directly from currently published sale and
                rental properties.
              </p>
            </div>
            <div className="mt-10">
              {areas.length > 0 ? (
                <div className="grid gap-3">
                  <button
                    type="button"
                    aria-pressed={selectedArea === null}
                    onClick={() => setSelectedArea(null)}
                    className={`focus-ring grid min-h-16 grid-cols-[1fr_auto] items-center rounded-xl border px-5 text-left ${selectedArea === null ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/35"}`}
                  >
                    <span className="font-semibold">All published areas</span>
                    <span className="text-sm text-muted-foreground">
                      {sales.length + rentals.length} properties
                    </span>
                  </button>
                  {areas.map((area) => (
                    <button
                      key={area.key}
                      type="button"
                      aria-pressed={selectedArea === area.key}
                      onClick={() => setSelectedArea(area.key)}
                      className={`focus-ring grid min-h-16 grid-cols-[1fr_auto] items-center rounded-xl border px-5 text-left ${selectedArea === area.key ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/35"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <MapPin
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {area.city}, {area.state}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {area.saleCount +
                          area.rentalCount +
                          area.completedCount}{" "}
                        properties
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="border-y border-border py-6 text-sm leading-6 text-muted-foreground">
                  Featured areas will appear as published properties are added.
                </p>
              )}
              <div
                aria-live="polite"
                className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"
              >
                <p className="text-muted-foreground">
                  {activeArea
                    ? `${activeArea.saleCount} for sale, ${activeArea.rentalCount} rentals, ${activeArea.completedCount} completed in ${activeArea.key}`
                    : "Showing all published areas"}
                </p>
                <a
                  href="#for-sale"
                  className="focus-ring rounded font-semibold text-foreground hover:text-primary"
                >
                  View sale homes
                </a>
                <a
                  href="#rentals"
                  className="focus-ring rounded font-semibold text-foreground hover:text-primary"
                >
                  View rentals
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
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
