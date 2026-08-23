"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  MapPin,
  Ruler,
} from "lucide-react";
import { useRef } from "react";

export type ListingPreview = {
  id: string;
  kind: "sale" | "rental";
  name: string;
  address: string;
  city: string;
  state: string;
  image: string;
  imageAlt: string;
  href: string;
  availability: "available" | "sold" | "rented";
  price: string;
  dateLabel: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
};

export function ListingRail({
  listings,
  emptyMessage,
  onAreaSelect,
  ariaLabel,
}: {
  listings: ListingPreview[];
  emptyMessage: string;
  onAreaSelect: (area: string) => void;
  ariaLabel: string;
}) {
  const rail = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    rail.current?.scrollBy({
      left: direction * Math.min(460, window.innerWidth * 0.82),
      behavior,
    });
  }

  if (listings.length === 0) {
    return (
      <div className="border-y border-border py-12 text-sm leading-6 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          className="focus-ring flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-primary/35 hover:bg-secondary"
          aria-label={`Previous ${ariaLabel}`}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="focus-ring flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-primary/35 hover:bg-secondary"
          aria-label={`Next ${ariaLabel}`}
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div
        ref={rail}
        className="grid snap-x snap-mandatory auto-cols-[minmax(18rem,26rem)] grid-flow-col gap-5 overflow-x-auto pb-5 pr-[max(1rem,calc((100vw-88rem)/2))] [scrollbar-width:thin]"
        aria-label={ariaLabel}
      >
        {listings.map((listing) => (
          <article
            key={`${listing.kind}-${listing.id}`}
            className="group snap-start overflow-hidden rounded-[1.25rem] border border-border bg-card transition-[border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_20px_50px_-30px_rgba(13,18,17,0.3)]"
          >
            <Link
              href={listing.href}
              transitionTypes={["nav-forward"]}
              className="focus-ring relative block aspect-[4/3] overflow-hidden bg-secondary"
              aria-label={`View ${listing.name}`}
            >
              <Image
                src={listing.image}
                alt={listing.imageAlt}
                fill
                sizes="(min-width: 768px) 26rem, 82vw"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.025]"
              />
              {listing.availability !== "available" && (
                <span className="absolute left-4 top-4 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-sm">
                  {listing.availability === "sold" ? "Sold" : "Rented"}
                </span>
              )}
            </Link>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-semibold text-primary">
                  {listing.availability === "sold"
                    ? "Sold home"
                    : listing.availability === "rented"
                      ? "Rental closed"
                      : listing.kind === "sale"
                        ? "For sale"
                        : "For rent"}
                </p>
                <time className="text-xs text-muted-foreground">
                  {listing.dateLabel}
                </time>
              </div>
              <Link
                href={listing.href}
                transitionTypes={["nav-forward"]}
                className="focus-ring mt-3 block rounded"
              >
                <h3 className="text-2xl font-semibold leading-tight tracking-[-0.035em] group-hover:text-primary">
                  {listing.name}
                </h3>
              </Link>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                {listing.price}
              </p>
              <button
                type="button"
                onClick={() =>
                  onAreaSelect(`${listing.city}, ${listing.state}`)
                }
                className="focus-ring mt-3 flex w-fit items-start gap-2 rounded text-left text-sm leading-6 text-muted-foreground hover:text-primary"
              >
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {listing.address}, {listing.city}, {listing.state}
                </span>
              </button>
              <dl className="mt-5 grid grid-cols-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <div>
                  <dt className="flex items-center gap-1.5">
                    <BedDouble className="size-4" aria-hidden="true" />
                    Beds
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {listing.bedrooms ?? "Ask"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5">
                    <Bath className="size-4" aria-hidden="true" />
                    Baths
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {listing.bathrooms ?? "Ask"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5">
                    <Ruler className="size-4" aria-hidden="true" />
                    Sq. ft.
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {listing.squareFeet?.toLocaleString() ?? "Ask"}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
