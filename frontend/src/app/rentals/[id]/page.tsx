"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, ViewTransition } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  MapPin,
  Ruler,
} from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { rentalPrice, type RentalProperty } from "@/lib/rental-properties";
import { formatCurrency } from "@/lib/sale-listings";

function display(value: number | null | undefined, fallback = "Ask our team") {
  return value == null ? fallback : value.toLocaleString();
}

export default function PublicRentalPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  useEffect(() => {
    let active = true;
    void api
      .get(`/public/rental-properties/${id}`)
      .then((rental: RentalProperty) => {
        if (!active) return;
        setProperty(rental);
        setFailed(false);
        setSelectedPhoto(0);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!property && !failed) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        <main
          id="main-content"
          className="public-container py-10 sm:py-16"
          aria-label="Loading rental property"
        >
          <Skeleton className="h-6 w-44" />
          <Skeleton className="mt-8 aspect-[16/10] w-full rounded-[1.75rem] lg:aspect-[2/1]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-[1.5rem]" />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (failed || !property) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <SiteHeader />
        <main
          id="main-content"
          className="public-container flex min-h-[70dvh] flex-col items-center justify-center py-20 text-center"
        >
          <Building2
            className="size-14 text-primary"
            strokeWidth={1.3}
            aria-hidden="true"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
            This rental profile is unavailable
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            The property may have been unpublished. Contact our team and we will
            help you find another home.
          </p>
          <Link
            href="/contact?intent=rent"
            transitionTypes={["nav-back"]}
            className={buttonVariants({ className: "mt-7" })}
          >
            Ask about rentals
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const rented = property.status === "rented";
  const unit = property.units[0];
  const price = rentalPrice(property);
  const photos =
    property.photos.length > 0
      ? property.photos
      : ["/images/coach-johnson/missouri-brick-rental.webp"];
  const activePhoto = photos[Math.min(selectedPhoto, photos.length - 1)];
  const search = new URLSearchParams({
    intent: rented ? "similar-rental" : "rent",
    property: property.name,
    address: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
  });

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        <main
          id="main-content"
          className="public-container py-8 sm:py-12 lg:py-16"
        >
          <Link
            href="/rentals"
            transitionTypes={["nav-back"]}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Home rentals
          </Link>

          <ViewTransition
            name={`rental-${property.id}`}
            share="morph"
            default="none"
          >
            <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-secondary sm:aspect-[16/10] lg:aspect-[2/1] lg:rounded-[2rem]">
              <Image
                src={activePhoto}
                alt={
                  property.photos.length > 0
                    ? `${property.name} photo ${selectedPhoto + 1} of ${photos.length}`
                    : `Representative Missouri home for ${property.name}`
                }
                fill
                loading="eager"
                sizes="(min-width: 1536px) 1400px, 100vw"
                className="object-cover"
              />
              {rented && (
                <span className="absolute left-5 top-5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm">
                  Rented
                </span>
              )}
            </div>
          </ViewTransition>

          {photos.length > 1 ? (
            <div
              className="mt-4 flex gap-3 overflow-x-auto pb-2"
              aria-label="Rental property photos"
            >
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  aria-label={`Show photo ${index + 1} of ${photos.length}`}
                  aria-pressed={selectedPhoto === index}
                  onClick={() => setSelectedPhoto(index)}
                  className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-transparent bg-secondary outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 aria-pressed:border-primary"
                >
                  <Image
                    src={photo}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-16">
            <article>
              <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {rented
                      ? "Rental completed"
                      : property.propertyType || "Rental home"}
                  </p>
                  <h1 className="mt-2 text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[.98] tracking-[-0.05em]">
                    {property.name}
                  </h1>
                  <p className="mt-4 flex max-w-2xl items-start gap-2 text-sm leading-6 text-muted-foreground">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {property.address}, {property.city}, {property.state}{" "}
                    {property.zip}
                  </p>
                </div>
                <p className="shrink-0 text-2xl font-semibold tracking-[-0.035em]">
                  {price == null
                    ? "Contact for pricing"
                    : `${formatCurrency(price)} / month`}
                </p>
              </div>

              <dl className="grid grid-cols-3 border-b border-border py-6">
                <div>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BedDouble className="size-4" aria-hidden="true" />
                    Bedrooms
                  </dt>
                  <dd className="mt-2 text-lg font-semibold">
                    {display(unit?.bedrooms ?? property.bedrooms)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bath className="size-4" aria-hidden="true" />
                    Bathrooms
                  </dt>
                  <dd className="mt-2 text-lg font-semibold">
                    {display(unit?.bathrooms ?? property.bathrooms)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Ruler className="size-4" aria-hidden="true" />
                    Square feet
                  </dt>
                  <dd className="mt-2 text-lg font-semibold">
                    {display(unit?.squareFeet ?? property.squareFeet)}
                  </dd>
                </div>
              </dl>

              <section className="py-9">
                <h2 className="text-xl font-semibold tracking-[-0.025em]">
                  About this property
                </h2>
                <p className="mt-4 whitespace-pre-line text-base leading-8 text-muted-foreground">
                  {property.description ||
                    "Our property team can share lease details, availability, and the complete story of this home."}
                </p>
              </section>

              {property.amenities.length > 0 && (
                <section className="border-t border-border py-9">
                  <h2 className="text-xl font-semibold tracking-[-0.025em]">
                    Features
                  </h2>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {property.amenities.map((amenity) => (
                      <li
                        key={amenity}
                        className="rounded-full border border-border bg-card px-4 py-2 text-sm"
                      >
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {property.utilityInfo ? (
                <section className="border-t border-border py-9">
                  <h2 className="text-xl font-semibold tracking-[-0.025em]">
                    Utilities and lease details
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {property.utilityInfo}
                  </p>
                </section>
              ) : null}
            </article>

            <aside>
              <Card className="lg:sticky lg:top-24">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {rented ? "Property record" : "Current availability"}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold">
                    {rented
                      ? "This home has been rented."
                      : "Interested in this home?"}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {rented
                      ? "Its profile remains here as part of our rental history. We can help you find a similar home."
                      : "Ask our local property team about vacant units, lease terms, and next steps."}
                  </p>
                  <Link
                    href={`/contact?${search.toString()}`}
                    transitionTypes={["nav-forward"]}
                    className={buttonVariants({ className: "mt-6 w-full" })}
                  >
                    {rented
                      ? "Find a similar rental"
                      : "Ask about availability"}
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
