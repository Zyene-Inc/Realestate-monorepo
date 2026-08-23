"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  MapPin,
  RefreshCw,
  Ruler,
} from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { rentalPrice, type RentalProperty } from "@/lib/rental-properties";
import { formatCurrency } from "@/lib/sale-listings";

const fallback = "/images/coach-johnson/missouri-brick-rental.webp";

export default function PublicRentalsPage() {
  const [rentals, setRentals] = useState<RentalProperty[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const load = async () => {
    setStatus("loading");
    try {
      const rows = (await api.get(
        "/public/rental-properties",
      )) as RentalProperty[];
      setRentals(
        rows.sort(
          (a, b) =>
            Number(a.status === "rented") - Number(b.status === "rented"),
        ),
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    api
      .get("/public/rental-properties")
      .then((rows: RentalProperty[]) => {
        setRentals(
          rows.sort(
            (a, b) =>
              Number(a.status === "rented") - Number(b.status === "rented"),
          ),
        );
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        <main id="main-content">
          <section className="public-container grid gap-10 border-b border-border py-16 sm:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:py-28">
            <div>
              <p className="text-sm font-semibold text-primary">
                Homes for rent
              </p>
              <h1 className="mt-4 max-w-4xl text-[clamp(3rem,7vw,6.6rem)] font-semibold leading-[.93] tracking-[-0.055em]">
                Live availability, managed locally.
              </h1>
            </div>
            <p className="max-w-lg text-base leading-7 text-muted-foreground lg:justify-self-end">
              These homes publish directly from the Coach Johnson Realty rental
              desk. Availability and vacant-unit pricing come from the same
              system our staff uses.
            </p>
          </section>
          <section
            className="public-container py-12 sm:py-16 lg:py-20"
            aria-live="polite"
          >
            {status === "loading" ? (
              <div
                className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
                aria-label="Loading rentals"
              >
                {[0, 1, 2].map((item) => (
                  <Card key={item} className="overflow-hidden">
                    <Skeleton className="h-64 rounded-none" />
                    <CardContent className="space-y-3 p-6">
                      <Skeleton className="h-7 w-3/4" />
                      <Skeleton className="h-5 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : status === "error" ? (
              <Card className="mx-auto max-w-xl">
                <CardContent className="flex flex-col items-center py-14 text-center">
                  <Building2 className="size-11 text-primary" />
                  <h2 className="mt-5 text-2xl font-semibold">
                    Rental availability could not load
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The property service may be briefly unavailable.
                  </p>
                  <Button
                    className="mt-6"
                    variant="outline"
                    onClick={() => void load()}
                  >
                    <RefreshCw /> Try again
                  </Button>
                </CardContent>
              </Card>
            ) : rentals.length === 0 ? (
              <div className="mx-auto max-w-xl border-y border-border py-16 text-center">
                <Building2 className="mx-auto size-11 text-primary" />
                <h2 className="mt-5 text-2xl font-semibold">
                  No rentals are published today
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Contact the rental team and tell us what you need next.
                </p>
                <Button
                  nativeButton={false}
                  className="mt-6"
                  render={<Link href="/contact?intent=rent" />}
                >
                  Contact rental team
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {rentals.map((property) => {
                  const unit = property.units[0];
                  const price = rentalPrice(property);
                  const rented = property.status === "rented";
                  return (
                    <Link
                      key={property.id}
                      href={`/rentals/${property.id}`}
                      className="group rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
                    >
                      <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/35">
                        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                          <Image
                            src={property.photos[0] || fallback}
                            alt={`${property.name} rental`}
                            fill
                            sizes="(min-width: 1280px) 32vw, (min-width: 768px) 48vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                          />
                          <span className="absolute left-4 top-4 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                            {rented ? "Rented" : "Available"}
                          </span>
                        </div>
                        <CardContent className="p-6">
                          <p className="text-sm font-semibold text-primary">
                            {price == null
                              ? "Contact for pricing"
                              : `${formatCurrency(price)} / month`}
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                            {property.name}
                          </h2>
                          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                            {property.address}, {property.city},{" "}
                            {property.state}
                          </p>
                          <dl className="mt-5 grid grid-cols-3 border-t border-border pt-4 text-sm">
                            <div>
                              <dt className="flex items-center gap-1 text-muted-foreground">
                                <BedDouble className="size-4" /> Beds
                              </dt>
                              <dd className="mt-1 font-semibold">
                                {unit?.bedrooms ?? property.bedrooms ?? "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="flex items-center gap-1 text-muted-foreground">
                                <Bath className="size-4" /> Baths
                              </dt>
                              <dd className="mt-1 font-semibold">
                                {unit?.bathrooms ?? property.bathrooms ?? "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="flex items-center gap-1 text-muted-foreground">
                                <Ruler className="size-4" /> Sq ft
                              </dt>
                              <dd className="mt-1 font-semibold">
                                {unit?.squareFeet ?? property.squareFeet ?? "—"}
                              </dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
