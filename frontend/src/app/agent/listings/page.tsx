"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Buy / Sell portal
          </p>
          <h1 className="mt-2 text-4xl font-bold font-heading">
            Sale listings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create listings and submit them for Johnson Realty approval.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Link href="/agent/listings/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" /> New listing
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No sale listings yet.</p>
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
                <div className="h-48 bg-secondary">
                  {listing.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.photos[0]}
                      alt={listing.name}
                      className="h-full w-full object-cover"
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
                        {listing.city}, {listing.state} ·{" "}
                        {formatCurrency(listing.price)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {listingStatusLabel(listing.listingStatus)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {listing.rejectionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <strong>Changes requested:</strong>{" "}
                      {listing.rejectionReason}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Link
                      href={`/agent/listings/${listing.id}`}
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
