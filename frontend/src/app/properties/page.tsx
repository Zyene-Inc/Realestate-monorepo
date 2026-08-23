"use client";

import { useEffect, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { PropertyCard } from "@/components/public/property-card";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { SaleListing } from "@/lib/sale-listings";

export default function PublicPropertiesPage() {
  const [properties, setProperties] = useState<SaleListing[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const loadProperties = () => {
    setStatus("loading");
    api
      .get("/public/sale-listings")
      .then((listings: SaleListing[]) => {
        setProperties(
          listings.sort(
            (a, b) => Number(a.status === "sold") - Number(b.status === "sold"),
          ),
        );
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    api
      .get("/public/sale-listings")
      .then((listings: SaleListing[]) => {
        setProperties(
          listings.sort(
            (a, b) => Number(a.status === "sold") - Number(b.status === "sold"),
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
                Homes for sale
              </p>
              <h1 className="mt-4 max-w-4xl text-[clamp(3rem,7vw,6.6rem)] font-semibold leading-[.93] tracking-[-0.055em]">
                A considered collection, not a crowded feed.
              </h1>
            </div>
            <p className="max-w-lg text-base leading-7 text-muted-foreground lg:justify-self-end">
              Every home is reviewed before it appears here. Available homes
              come first, while sold profiles remain visible as part of the
              public property record.
            </p>
          </section>

          <section
            className="public-container py-12 sm:py-16 lg:py-20"
            aria-live="polite"
          >
            {status === "loading" ? (
              <div
                className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
                aria-label="Loading properties"
              >
                {[0, 1, 2, 3].map((item) => (
                  <Card
                    key={item}
                    className={
                      item === 0
                        ? "overflow-hidden md:col-span-2"
                        : "overflow-hidden"
                    }
                  >
                    <Skeleton
                      className={
                        item === 0 ? "h-80 rounded-none" : "h-64 rounded-none"
                      }
                    />
                    <CardContent className="space-y-4 p-6">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : status === "error" ? (
              <Card className="mx-auto max-w-xl">
                <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                  <Building2
                    className="size-12 text-primary"
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                  <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                    The collection could not load
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    The listing service may be briefly unavailable. Your place
                    on the page is safe.
                  </p>
                  <Button
                    className="mt-6"
                    variant="outline"
                    onClick={loadProperties}
                  >
                    <RefreshCw aria-hidden="true" />
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : properties.length === 0 ? (
              <div className="mx-auto max-w-2xl border-y border-border py-16 text-center">
                <Building2
                  className="mx-auto size-12 text-primary"
                  strokeWidth={1.4}
                  aria-hidden="true"
                />
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                  New homes are being prepared
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  Nothing has passed the final review yet. Check back soon, or
                  contact our team to share what you are looking for.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {properties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    featured={index === 0}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
