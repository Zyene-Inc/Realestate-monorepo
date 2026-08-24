"use client";

import Image from "next/image";
import { useMemo, useState, ViewTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RentalProperty } from "@/lib/rental-properties";
import { cn } from "@/lib/utils";

const fallbackPhoto = "/images/coach-johnson/missouri-brick-rental.webp";

type RentalDetailGalleryProps = {
  property: RentalProperty;
};

export function RentalDetailGallery({ property }: RentalDetailGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const photos = useMemo(
    () => (property.photos.length > 0 ? property.photos : [fallbackPhoto]),
    [property.photos],
  );
  const activeIndex = Math.min(selectedPhoto, photos.length - 1);
  const secondaryIndexes: number[] = [];
  for (let index = 0; index < photos.length; index += 1) {
    if (index !== activeIndex) secondaryIndexes.push(index);
    if (secondaryIndexes.length === 2) break;
  }

  const showPrevious = () => {
    setSelectedPhoto((current) =>
      current === 0 ? photos.length - 1 : current - 1,
    );
  };

  const showNext = () => {
    setSelectedPhoto((current) => (current + 1) % photos.length);
  };

  const alt =
    property.photos.length > 0
      ? `${property.name}, photo ${activeIndex + 1} of ${photos.length}`
      : `Representative Missouri rental home for ${property.name}`;

  return (
    <section className="mt-4 sm:mt-6" aria-label="Rental property gallery">
      <ViewTransition
        name={`rental-${property.id}`}
        share="morph"
        default="none"
      >
        <div className="grid overflow-hidden rounded-[1.25rem] bg-secondary lg:h-[clamp(28rem,46vw,39rem)] lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:gap-1.5 lg:rounded-[1.75rem]">
          <div className="group relative aspect-[4/3] overflow-hidden sm:aspect-[16/10] lg:aspect-auto">
            <Image
              key={photos[activeIndex]}
              src={photos[activeIndex]}
              alt={alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.012]"
            />
            {photos.length > 1 ? (
              <div className="absolute inset-x-4 bottom-4 flex justify-between sm:inset-x-5 sm:bottom-5">
                <button
                  type="button"
                  onClick={showPrevious}
                  className="focus-ring flex size-11 items-center justify-center rounded-full border border-white/30 bg-brand/88 text-white shadow-sm transition-transform hover:scale-[1.04] active:scale-[0.98]"
                  aria-label="Show previous photo"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="focus-ring flex size-11 items-center justify-center rounded-full border border-white/30 bg-brand/88 text-white shadow-sm transition-transform hover:scale-[1.04] active:scale-[0.98]"
                  aria-label="Show next photo"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          {secondaryIndexes.length > 0 ? (
            <div
              className={cn(
                "hidden min-h-0 gap-1.5 lg:grid",
                secondaryIndexes.length === 1 ? "grid-rows-1" : "grid-rows-2",
              )}
            >
              {secondaryIndexes.map((index) => (
                <button
                  key={`${photos[index]}-${index}`}
                  type="button"
                  onClick={() => setSelectedPhoto(index)}
                  className="focus-ring group relative min-h-0 overflow-hidden bg-secondary text-left"
                  aria-label={`Show photo ${index + 1} of ${photos.length}`}
                >
                  <Image
                    src={photos[index]}
                    alt=""
                    fill
                    sizes="33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </ViewTransition>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Photo {activeIndex + 1} of {photos.length}
        </p>
        {photos.length > 1 ? (
          <div
            className="flex max-w-[70%] gap-2 overflow-x-auto py-1"
            aria-label="Choose a property photo"
          >
            {photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                aria-label={`Show photo ${index + 1} of ${photos.length}`}
                aria-pressed={activeIndex === index}
                onClick={() => setSelectedPhoto(index)}
                className="focus-ring relative h-14 w-20 shrink-0 overflow-hidden rounded-[0.75rem] border-2 border-transparent bg-secondary transition-opacity hover:opacity-90 aria-pressed:border-primary"
              >
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
