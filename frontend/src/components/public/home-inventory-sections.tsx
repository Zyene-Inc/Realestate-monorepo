import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import {
  ListingRail,
  type ListingPreview,
} from "@/components/public/listing-rail";

export type Area = {
  key: string;
  city: string;
  state: string;
  saleCount: number;
  rentalCount: number;
  completedCount: number;
};

type InventorySectionProps = {
  id: string;
  bordered?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  linkHref: string;
  linkLabel: string;
  listings: ListingPreview[];
  emptyMessage: string;
  onAreaSelect: (area: string) => void;
  ariaLabel: string;
};

export function InventorySection({
  id,
  bordered = false,
  eyebrow,
  title,
  description,
  linkHref,
  linkLabel,
  listings,
  emptyMessage,
  onAreaSelect,
  ariaLabel,
}: InventorySectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 py-20 sm:py-28 ${bordered ? "border-y border-border bg-card" : ""}`}
    >
      <div className="public-container mb-9 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          href={linkHref}
          transitionTypes={["nav-forward"]}
          className="focus-ring inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
        >
          {linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="ml-[max(1rem,calc((100vw-88rem)/2))]">
        <ListingRail
          listings={listings}
          emptyMessage={emptyMessage}
          onAreaSelect={onAreaSelect}
          ariaLabel={ariaLabel}
        />
      </div>
    </section>
  );
}

type FeaturedAreasProps = {
  areas: Area[];
  activeArea: Area | null;
  selectedArea: string | null;
  setSelectedArea: (area: string | null) => void;
  propertyCount: number;
};

export function FeaturedAreas({
  areas,
  activeArea,
  selectedArea,
  setSelectedArea,
  propertyCount,
}: FeaturedAreasProps) {
  return (
    <section id="featured-areas" className="scroll-mt-24 py-20 sm:py-28">
      <div className="public-container grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch">
        <div className="relative min-h-[28rem] overflow-hidden rounded-[1.5rem] lg:min-h-[38rem]">
          <Image
            src="/images/coach-johnson/missouri-neighborhood.webp"
            alt="Established Missouri neighborhood with varied homes and mature trees"
            fill
            sizes="(min-width: 1024px) 54vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-between rounded-[1.5rem] border border-border bg-background p-7 sm:p-10 lg:p-12">
          <div>
            <p className="text-sm font-semibold text-primary">
              Discover featured areas
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
              Follow the addresses that shape our work.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Coverage is drawn directly from currently published sale and
              rental properties.
            </p>
          </div>
          <div className="mt-10">
            {areas.length > 0 ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  aria-pressed={selectedArea === null}
                  onClick={() => setSelectedArea(null)}
                  className={`focus-ring grid min-h-16 grid-cols-[1fr_auto] items-center rounded-xl border px-5 text-left ${selectedArea === null ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/35"}`}
                >
                  <span className="font-semibold">All published areas</span>
                  <span className="text-sm text-muted-foreground">
                    {propertyCount} properties
                  </span>
                </button>
                {areas.map((area) => (
                  <button
                    key={area.key}
                    type="button"
                    aria-pressed={selectedArea === area.key}
                    onClick={() => setSelectedArea(area.key)}
                    className={`focus-ring grid min-h-16 grid-cols-[1fr_auto] items-center rounded-xl border px-5 text-left ${selectedArea === area.key ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/35"}`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <MapPin
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      {area.city}, {area.state}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {area.saleCount + area.rentalCount + area.completedCount}{" "}
                      properties
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="border-y border-border py-6 text-sm leading-6 text-muted-foreground">
                Featured areas will appear as published properties are added.
              </p>
            )}
            <div
              aria-live="polite"
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"
            >
              <p className="text-muted-foreground">
                {activeArea
                  ? `${activeArea.saleCount} for sale, ${activeArea.rentalCount} rentals, ${activeArea.completedCount} completed in ${activeArea.key}`
                  : "Showing all published areas"}
              </p>
              <a
                href="#for-sale"
                className="focus-ring rounded font-semibold text-foreground hover:text-primary"
              >
                View sale homes
              </a>
              <a
                href="#rentals"
                className="focus-ring rounded font-semibold text-foreground hover:text-primary"
              >
                View rentals
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
