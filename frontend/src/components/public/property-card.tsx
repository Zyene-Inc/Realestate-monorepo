import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { Bath, BedDouble, Building2, MapPin, Ruler } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, type SaleListing } from "@/lib/sale-listings";
import { cn } from "@/lib/utils";

function fact(value: number | null | undefined, fallback: string) {
  return value == null ? fallback : value.toLocaleString();
}

export function PropertyCard({ property, featured = false }: { property: SaleListing; featured?: boolean }) {
  return (
    <Link href={`/properties/${property.id}`} transitionTypes={["nav-forward"]} className={cn("group block", featured && "md:col-span-2 xl:col-span-2")} aria-label={`View ${property.name} in ${property.city}`}>
      <Card className={cn("grid h-full overflow-hidden border-border/90 bg-card transition-[border-color,box-shadow,transform] duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-[0_20px_50px_-28px_rgba(13,18,17,0.32)]", featured && "lg:grid-cols-[1.35fr_.65fr]")}>
        <ViewTransition name={`property-${property.id}`} share="morph" default="none">
          <div className={cn("relative min-h-64 overflow-hidden bg-secondary", featured && "lg:min-h-[27rem]")}>
            {property.photos[0] ? (
              <Image src={property.photos[0]} alt={`${property.name} exterior`} fill sizes={featured ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw"} className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]" />
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center" aria-hidden="true"><Building2 className="size-14 text-muted-foreground/35" strokeWidth={1.4} /></div>
            )}
            <p className="absolute bottom-4 left-4 rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border">{formatCurrency(property.price)}</p>
          </div>
        </ViewTransition>
        <CardContent className={cn("flex flex-col justify-between p-6 sm:p-7", featured && "lg:p-9")}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">For sale</p>
            <h2 className={cn("mt-3 text-2xl font-semibold tracking-[-0.035em]", featured && "lg:text-3xl")}>{property.name}</h2>
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{property.city}, {property.state}</p>
          </div>
          <div className="mt-8">
            <div className="grid grid-cols-3 gap-2 border-y border-border py-4 text-sm">
              <span className="flex items-center gap-2"><BedDouble className="size-4 text-muted-foreground" aria-hidden="true" />{fact(property.bedrooms, "Open")}</span>
              <span className="flex items-center gap-2"><Bath className="size-4 text-muted-foreground" aria-hidden="true" />{fact(property.bathrooms, "Open")}</span>
              <span className="flex items-center gap-2"><Ruler className="size-4 text-muted-foreground" aria-hidden="true" />{fact(property.squareFeet, "Ask")}</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Presented by {property.agent?.companyName || "Coach Johnson Realty"}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
