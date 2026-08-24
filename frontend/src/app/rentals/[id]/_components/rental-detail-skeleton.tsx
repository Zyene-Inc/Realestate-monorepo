import { Skeleton } from "@/components/ui/skeleton";

export function RentalDetailSkeleton() {
  return (
    <main
      id="main-content"
      className="public-container pb-20 pt-8"
      aria-label="Loading rental property"
    >
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-6 aspect-[4/3] w-full rounded-[1.25rem] sm:aspect-[16/10] lg:h-[clamp(28rem,46vw,39rem)] lg:rounded-[1.75rem]" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23.5rem]">
        <div className="space-y-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="mt-8 h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-[1.25rem]" />
      </div>
    </main>
  );
}
