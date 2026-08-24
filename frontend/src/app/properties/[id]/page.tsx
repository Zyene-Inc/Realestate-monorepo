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
  Mail,
  MapPin,
  Phone,
  Ruler,
} from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { BuyerInquiryPanel } from "@/components/public/buyer-inquiry-panel";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, type SaleListing } from "@/lib/sale-listings";

function display(value: number | null | undefined, fallback = "Ask agent") {
  return value == null ? fallback : value.toLocaleString();
}

export default function PublicSaleListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<SaleListing | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  useEffect(() => {
    let active = true;
    void api
      .get(`/public/sale-listings/${id}`)
      .then((saleListing: SaleListing) => {
        if (!active) return;
        setListing(saleListing);
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

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        {!listing && !failed ? (
          <main
            id="main-content"
            className="public-container py-10 sm:py-16"
            aria-label="Loading property"
          >
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-8 aspect-[16/10] w-full rounded-[1.75rem] lg:aspect-[2/1]" />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
              <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-14 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-72 w-full rounded-[1.5rem]" />
            </div>
          </main>
        ) : failed ? (
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
              This listing is no longer available
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              It may have been sold, withdrawn, or returned to review. The
              current collection is ready when you are.
            </p>
            <Link
              href="/properties"
              transitionTypes={["nav-back"]}
              className={buttonVariants({ className: "mt-7" })}
            >
              Browse available homes
            </Link>
          </main>
        ) : listing ? (
          <main
            id="main-content"
            className="public-container py-8 sm:py-12 lg:py-16"
          >
            <Link
              href="/properties"
              transitionTypes={["nav-back"]}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              All properties
            </Link>

            <ViewTransition
              name={`property-${listing.id}`}
              share="morph"
              default="none"
            >
              <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-secondary sm:aspect-[16/10] lg:aspect-[2/1] lg:rounded-[2rem]">
                {listing.photos[selectedPhoto] ? (
                  <Image
                    src={listing.photos[selectedPhoto]}
                    alt={`${listing.name} photo ${selectedPhoto + 1} of ${listing.photos.length}`}
                    fill
                    loading="eager"
                    sizes="(min-width: 1536px) 1400px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2
                      className="size-20 text-muted-foreground/30"
                      strokeWidth={1.2}
                      aria-hidden="true"
                    />
                  </div>
                )}
                {listing.status === "sold" && (
                  <span className="absolute left-5 top-5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm">
                    Sold
                  </span>
                )}
              </div>
            </ViewTransition>

            {listing.photos.length > 1 && (
              <div
                className="mt-4 flex gap-3 overflow-x-auto pb-2"
                aria-label="Sale property photos"
              >
                {listing.photos.map((photo, index) => (
                  <button
                    key={photo}
                    type="button"
                    aria-label={`Show photo ${index + 1} of ${listing.photos.length}`}
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
            )}

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-16">
              <article>
                <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {listing.status === "sold"
                        ? "Sold home"
                        : listing.propertyType || "Residential"}
                    </p>
                    <h1 className="mt-2 text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[.98] tracking-[-0.05em]">
                      {listing.name}
                    </h1>
                    <p className="mt-4 flex max-w-2xl items-start gap-2 text-sm leading-6 text-muted-foreground">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {listing.address}, {listing.city}, {listing.state}{" "}
                      {listing.zip}
                    </p>
                  </div>
                  <p className="shrink-0 text-3xl font-semibold tracking-[-0.04em]">
                    {formatCurrency(listing.price)}
                  </p>
                </div>

                <dl className="grid grid-cols-3 border-b border-border py-6">
                  <div>
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BedDouble className="size-4" aria-hidden="true" />
                      Bedrooms
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      {display(listing.bedrooms)}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bath className="size-4" aria-hidden="true" />
                      Bathrooms
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      {display(listing.bathrooms)}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Ruler className="size-4" aria-hidden="true" />
                      Square feet
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      {display(listing.squareFeet)}
                    </dd>
                  </div>
                </dl>

                <section className="py-9">
                  <h2 className="text-xl font-semibold tracking-[-0.025em]">
                    About this home
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-8 text-muted-foreground">
                    {listing.description ||
                      "The listing agent can share the complete property story, disclosures, and showing details."}
                  </p>
                </section>

                {listing.amenities.length > 0 && (
                  <section className="border-t border-border py-9">
                    <h2 className="text-xl font-semibold tracking-[-0.025em]">
                      Features
                    </h2>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {listing.amenities.map((amenity) => (
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
              </article>

              <aside>
                <Card className="lg:sticky lg:top-24">
                  <CardContent className="p-5 sm:p-6">
                    {listing.status === "sold" ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          Property record
                        </p>
                        <h2 className="mt-3 text-xl font-semibold">
                          This home has sold.
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          Its profile remains available as part of our sales
                          history. We can help you find a similar home or
                          discuss selling in this area.
                        </p>
                        <div className="mt-6 grid gap-2">
                          <Link
                            href="/properties"
                            transitionTypes={["nav-forward"]}
                            className={buttonVariants({ className: "w-full" })}
                          >
                            Browse available homes
                          </Link>
                          <Link
                            href="/contact?intent=buy-similar"
                            transitionTypes={["nav-forward"]}
                            className={buttonVariants({
                              variant: "outline",
                              className: "w-full",
                            })}
                          >
                            Find a similar home
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          Listing contact
                        </p>
                        <h2 className="mt-3 text-xl font-semibold">
                          {listing.agent?.contactName || "Property team"}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {listing.agent?.companyName || "Coach Johnson Realty"}
                        </p>
                        <div className="mt-5 grid gap-2">
                          {listing.agent?.email && (
                            <a
                              href={`mailto:${listing.agent.email}?subject=${encodeURIComponent(`Inquiry about ${listing.name}`)}`}
                              className={buttonVariants({
                                className: "w-full",
                              })}
                            >
                              <Mail aria-hidden="true" />
                              Email agent
                            </a>
                          )}
                          {listing.agent?.phone && (
                            <a
                              href={`tel:${listing.agent.phone}`}
                              className={buttonVariants({
                                variant: "outline",
                                className: "w-full",
                              })}
                            >
                              <Phone aria-hidden="true" />
                              {listing.agent.phone}
                            </a>
                          )}
                        </div>
                        <p className="mt-5 text-xs leading-5 text-muted-foreground">
                          This listing has completed our review. Financing,
                          escrow, and purchase payments are handled outside this
                          website.
                        </p>
                        <BuyerInquiryPanel listingId={listing.id} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>
          </main>
        ) : null}
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
