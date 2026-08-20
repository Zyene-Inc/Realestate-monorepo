"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Ruler,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { formatCurrency, type SaleListing } from "@/lib/sale-listings";
import { BuyerInquiryPanel } from "@/components/public/buyer-inquiry-panel";

export default function PublicSaleListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<SaleListing | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get(`/public/sale-listings/${id}`)
      .then(setListing)
      .catch(() => setFailed(true));
  }, [id]);

  if (!listing && !failed)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  if (failed)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5">
        <Building2 className="h-14 w-14 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold">Listing unavailable</h1>
        <Link href="/properties" className={buttonVariants()}>
          Browse approved listings
        </Link>
      </main>
    );
  if (!listing) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-8 py-5 lg:px-16">
        <Link href="/">
          <Logo className="h-9" />
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/properties"
          className="mb-8 inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All homes for sale
        </Link>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-3xl bg-secondary">
              {listing.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.photos[0]}
                  alt={listing.name}
                  className="h-[520px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center">
                  <Building2 className="h-20 w-20 text-muted-foreground/30" />
                </div>
              )}
            </div>
            {listing.photos.length > 1 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {listing.photos.slice(1).map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo}
                    src={photo}
                    alt={listing.name}
                    className="h-36 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
            <div>
              <p className="text-4xl font-extrabold font-heading">
                {formatCurrency(listing.price)}
              </p>
              <h1 className="mt-2 text-3xl font-bold">{listing.name}</h1>
              <p className="mt-3 flex items-center text-muted-foreground">
                <MapPin className="mr-2 h-5 w-5" />
                {listing.address}, {listing.city}, {listing.state} {listing.zip}
              </p>
              <div className="mt-6 flex flex-wrap gap-6 border-y border-border py-5 font-semibold">
                <span>
                  <BedDouble className="mr-2 inline h-5 w-5" />
                  {listing.bedrooms ?? "—"} beds
                </span>
                <span>
                  <Bath className="mr-2 inline h-5 w-5" />
                  {listing.bathrooms ?? "—"} baths
                </span>
                <span>
                  <Ruler className="mr-2 inline h-5 w-5" />
                  {listing.squareFeet?.toLocaleString() ?? "—"} sq ft
                </span>
              </div>
              <p className="mt-7 whitespace-pre-line leading-7 text-muted-foreground">
                {listing.description}
              </p>
            </div>
          </div>
          <Card className="h-fit rounded-3xl lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Contact the listing agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl bg-secondary p-5">
                <strong>{listing.agent?.contactName}</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  {listing.agent?.companyName}
                </p>
              </div>
              {listing.agent?.email && (
                <a
                  href={`mailto:${listing.agent.email}?subject=${encodeURIComponent(`Inquiry about ${listing.name}`)}`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  <Mail className="mr-2 h-4 w-4" />
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
                  <Phone className="mr-2 h-4 w-4" />
                  {listing.agent.phone}
                </a>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Johnson Realty reviewed this listing. Financing, escrow, and
                home-purchase payments are handled outside this website.
              </p>
              <BuyerInquiryPanel listingId={listing.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
