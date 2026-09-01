"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { RentalProperty } from "@/lib/rental-properties";
import { RentalListingCard } from "./_components/rental-listing-card";

async function fetchRentals() {
  const rows = (await api.get(
    "/public/rental-properties",
  )) as RentalProperty[];

  return [...rows].sort(
    (a, b) =>
      Number(a.status === "rented") - Number(b.status === "rented"),
  );
}

export default function PublicRentalsPage() {
  const [rentals, setRentals] = useState<RentalProperty[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setRentals(await fetchRentals());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    void fetchRentals()
      .then((rows) => {
        if (ignore) return;
        setRentals(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (!ignore) setStatus("error");
      });

    return () => {
      ignore = true;
    };
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
                {rentals.map((property, index) => {
                  return (
                    <RentalListingCard
                      key={property.id}
                      property={property}
                      prioritizeImage={index === 0}
                    />
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
