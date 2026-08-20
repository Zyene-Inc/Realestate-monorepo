"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  Loader2,
  MapPin,
  Ruler,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { formatCurrency, type SaleListing } from "@/lib/sale-listings";

export default function PublicPropertiesPage() {
  const [properties, setProperties] = useState<SaleListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/public/sale-listings")
      .then(setProperties)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-border bg-card/90 px-8 py-6 backdrop-blur-md lg:px-16">
        <Link href="/">
          <Logo className="h-10" />
        </Link>
        <nav className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground md:flex">
          <Link href="/about" className="hover:text-foreground">
            About us
          </Link>
          <Link href="/properties" className="text-foreground">
            Homes for sale
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-border px-6 py-2 hover:bg-secondary"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-8 py-20 lg:px-16">
        <div className="mx-auto mb-16 max-w-3xl space-y-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            Johnson Realty approved
          </p>
          <h1 className="text-5xl font-extrabold font-heading tracking-tight md:text-6xl">
            Homes for sale
          </h1>
          <p className="text-lg text-muted-foreground">
            Every listing below has completed Johnson Realty review. Contact the
            listed agent directly for property and showing questions.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <Card className="rounded-3xl">
            <CardContent className="py-20 text-center">
              <Building2 className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
              <h2 className="text-xl font-bold">
                No approved sale listings yet
              </h2>
              <p className="mt-2 text-muted-foreground">
                Please check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="h-full overflow-hidden rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="h-64 bg-secondary">
                    {property.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={property.photos[0]}
                        alt={property.name}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-5 p-7">
                    <div>
                      <p className="text-2xl font-bold font-heading">
                        {formatCurrency(property.price)}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        {property.name}
                      </h2>
                      <p className="mt-2 flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {property.city}, {property.state}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 border-t border-border pt-5 text-sm font-semibold">
                      <span>
                        <BedDouble className="mr-1 inline h-4 w-4" />
                        {property.bedrooms ?? "—"}
                      </span>
                      <span>
                        <Bath className="mr-1 inline h-4 w-4" />
                        {property.bathrooms ?? "—"}
                      </span>
                      <span>
                        <Ruler className="mr-1 inline h-4 w-4" />
                        {property.squareFeet?.toLocaleString() ?? "—"} sq ft
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Listed by {property.agent?.companyName}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
