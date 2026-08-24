"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { api } from "@/lib/api";
import type { RentalProperty } from "@/lib/rental-properties";
import {
  RentalDetailContent,
  RentalDetailHeader,
} from "./_components/rental-detail-content";
import { RentalDetailGallery } from "./_components/rental-detail-gallery";
import { RentalDetailSkeleton } from "./_components/rental-detail-skeleton";

export default function PublicRentalPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void api
      .get(`/public/rental-properties/${id}`)
      .then((rental: RentalProperty) => {
        if (!active) return;
        setProperty(rental);
        setFailed(false);
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
        <RentalDetailSkeleton />
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
          <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
            <Building2 className="size-8" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            This rental is no longer available
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            The property may have been unpublished or rented. Our team can help
            you find another home that fits your needs.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/rentals"
              transitionTypes={["nav-back"]}
              className={buttonVariants({ variant: "outline" })}
            >
              Browse rentals
            </Link>
            <Link
              href="/contact?intent=rent"
              transitionTypes={["nav-forward"]}
              className={buttonVariants()}
            >
              Contact rental team
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        <main id="main-content">
          <div className="public-container pt-6 sm:pt-8 lg:pt-10">
            <Link
              href="/rentals"
              transitionTypes={["nav-back"]}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              All rentals
            </Link>

            <RentalDetailHeader property={property} />
            <RentalDetailGallery property={property} />
            <RentalDetailContent property={property} />
          </div>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
