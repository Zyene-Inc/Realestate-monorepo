"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCurrency,
  listingStatusLabel,
  type SaleListing,
} from "@/lib/sale-listings";

export default function AgentListingsPage() {
  const [listings, setListings] = useState<SaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setListings(await api.get("/agent/listings"));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load listings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .get("/agent/listings")
      .then(setListings)
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load listings")),
      )
      .finally(() => setLoading(false));
  }, []);

  const submit = async (listing: SaleListing) => {
    setWorkingId(listing.id);
    try {
      const updated = await api.post(
        `/agent/listings/${listing.id}/submit`,
        {},
      );
      setListings((items) =>
        items.map((item) => (item.id === listing.id ? updated : item)),
      );
      toast.success("Listing submitted for review");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to submit listing"));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Company workspace"
        title="Sale listings"
        description="Prepare each property carefully, submit it for review, and follow its path to publication."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Link
              href="/agent/listings/new"
              transitionTypes={["nav-forward"]}
              className={buttonVariants()}
            >
              <Plus className="mr-2 h-4 w-4" /> New listing
            </Link>
          </>
        }
      />

      {loading ? (
        <div
          className="grid gap-6 lg:grid-cols-2"
          aria-label="Loading listings"
        >
          {[0, 1].map((item) => (
            <Card key={item}>
              <Skeleton className="h-56 rounded-none" />
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold">
              Your first listing starts here
            </h2>
            <p className="mt-2 text-muted-foreground">
              Add the property story, accurate details, photos, and review
              documents.
            </p>
            <Link
              href="/agent/listings/new"
              transitionTypes={["nav-forward"]}
              className={buttonVariants({ className: "mt-6" })}
            >
              Create a listing
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {listings.map((listing) => {
            const canSubmit = ["DRAFT", "REJECTED"].includes(
              listing.listingStatus ?? "",
            );
            return (
              <Card key={listing.id} className="overflow-hidden rounded-2xl">
                <div className="relative h-56 bg-secondary">
                  {listing.photos[0] ? (
                    <Image
                      src={listing.photos[0]}
                      alt={`${listing.name} exterior`}
                      fill
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{listing.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {listing.city}, {listing.state} /{" "}
                        {formatCurrency(listing.price)}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {listing.status === "sold" && <Badge>Sold</Badge>}
                      <Badge variant="outline">
                        {listingStatusLabel(listing.listingStatus)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {listing.rejectionReason && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
                      <strong>Changes requested:</strong>{" "}
                      {listing.rejectionReason}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Link
                      href={`/agent/listings/${listing.id}`}
                      transitionTypes={["nav-forward"]}
                      className={buttonVariants({
                        variant: "outline",
                        className: "flex-1",
                      })}
                    >
                      View and edit
                    </Link>
                    {canSubmit && (
                      <Button
                        className="flex-1"
                        onClick={() => submit(listing)}
                        disabled={workingId === listing.id}
                      >
                        <Send className="mr-2 h-4 w-4" /> Submit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
