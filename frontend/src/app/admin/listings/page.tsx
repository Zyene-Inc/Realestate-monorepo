"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  Check,
  Download,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCurrency,
  type SaleListing,
  type SaleListingAuditEvent,
} from "@/lib/sale-listings";

const auditDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});

async function openListingDocument(listingId: string, index: number) {
  try {
    const result = (await api.get(
      `/admin/sale-listings/${listingId}/documents/${index}/url`,
    )) as { url: string };
    window.open(result.url, "_blank", "noopener,noreferrer");
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, "Unable to open document"));
  }
}

export default function SaleListingReviewPage() {
  const [listings, setListings] = useState<SaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Record<string, SaleListingAuditEvent[]>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setListings(await api.get("/admin/sale-listings?status=PENDING_REVIEW"));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load listing queue"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .get("/admin/sale-listings?status=PENDING_REVIEW")
      .then(setListings)
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load listing queue")),
      )
      .finally(() => setLoading(false));
  }, []);

  const approve = async (id: string) => {
    setWorkingId(id);
    try {
      await api.patch(`/admin/sale-listings/${id}/approve`, {});
      setListings((items) => items.filter((item) => item.id !== id));
      toast.success("Sale listing approved and published");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to approve listing"));
    } finally {
      setWorkingId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = reasons[id]?.trim();
    if (!reason || reason.length < 3) {
      toast.error("Add a clear rejection reason");
      return;
    }
    setWorkingId(id);
    try {
      await api.patch(`/admin/sale-listings/${id}/reject`, { reason });
      setListings((items) => items.filter((item) => item.id !== id));
      toast.success("Listing returned to the agent");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to reject listing"));
    } finally {
      setWorkingId(null);
    }
  };

  const toggleHistory = async (listingId: string) => {
    if (historyId === listingId) {
      setHistoryId(null);
      return;
    }
    setHistoryId(listingId);
    if (history[listingId]) return;

    setHistoryLoadingId(listingId);
    try {
      const events = (await api.get(
        `/admin/sale-listings/${listingId}/audit-history`,
      )) as SaleListingAuditEvent[];
      setHistory((current) => ({ ...current, [listingId]: events }));
    } catch (error: unknown) {
      setHistoryId(null);
      toast.error(getErrorMessage(error, "Unable to load listing history"));
    } finally {
      setHistoryLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Buy / Sell oversight
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Listing review queue
          </h1>
          <p className="mt-2 text-muted-foreground">
            Only approved listings become visible on the public sale feed.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-20 text-center text-muted-foreground">
            No sale listings are waiting for review.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden rounded-2xl">
              <div className="grid lg:grid-cols-[360px_1fr]">
                <div className="min-h-72 bg-secondary">
                  {listing.photos[0] ? (
                    <Image
                      src={listing.photos[0]}
                      alt={`${listing.name} exterior`}
                      width={720}
                      height={560}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl">
                          {listing.name}
                        </CardTitle>
                        <p className="mt-2 flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-2 h-4 w-4" />
                          {listing.address}, {listing.city}, {listing.state}{" "}
                          {listing.zip}
                        </p>
                      </div>
                      <Badge>{formatCurrency(listing.price)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap gap-5 text-sm font-semibold">
                      <span>
                        <BedDouble className="mr-2 inline h-4 w-4" />
                        {listing.bedrooms ?? "Not listed"} beds
                      </span>
                      <span>
                        <Bath className="mr-2 inline h-4 w-4" />
                        {listing.bathrooms ?? "Not listed"} baths
                      </span>
                      <span>
                        {listing.squareFeet?.toLocaleString() ?? "Not listed"} sq ft
                      </span>
                      <span>
                        {listing.documents?.length ?? 0} private document(s)
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {listing.description}
                    </p>
                    {listing.documents?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {listing.documents.map((documentPath, index) => (
                          <Button
                            key={documentPath}
                            variant="outline"
                            size="sm"
                              onClick={() =>
                                void openListingDocument(listing.id, index)
                              }
                          >
                            <Download className="mr-2 h-4 w-4" /> Review
                            document {index + 1}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    <div className="rounded-xl bg-secondary/60 p-4 text-sm">
                      Submitted by <strong>{listing.agent?.companyName}</strong>{" "}
                      · {listing.agent?.contactName} · {listing.agent?.email}
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void toggleHistory(listing.id)}
                        disabled={historyLoadingId === listing.id}
                      >
                        {historyLoadingId === listing.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <History className="mr-2 h-4 w-4" />
                        )}
                        {historyId === listing.id
                          ? "Hide audit history"
                          : "View audit history"}
                      </Button>
                      {historyId === listing.id && history[listing.id] && (
                        <ListingAuditTimeline events={history[listing.id]} />
                      )}
                    </div>
                    <Textarea
                      placeholder="Required reason when requesting changes"
                      value={reasons[listing.id] ?? ""}
                      onChange={(event) =>
                        setReasons((current) => ({
                          ...current,
                          [listing.id]: event.target.value,
                        }))
                      }
                      maxLength={1000}
                    />
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={() => approve(listing.id)}
                        disabled={workingId === listing.id}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve and publish
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={() => reject(listing.id)}
                        disabled={workingId === listing.id}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Request changes
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingAuditTimeline({ events }: { events: SaleListingAuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="mt-3 rounded-xl border p-4 text-sm text-muted-foreground">
        No listing audit events were found.
      </p>
    );
  }

  return (
    <ol className="mt-4 space-y-0 border-l-2 border-border pl-5">
      {events.map((event) => {
        const details =
          typeof event.newValue === "object" && event.newValue
            ? event.newValue
            : null;
        const status = details?.listingStatus;
        const reason = details?.reason;
        return (
          <li key={event.id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <p className="text-sm font-semibold">
              {auditActionLabel(event.action)}
            </p>
            <p className="text-xs text-muted-foreground">
              {auditDateFormatter.format(new Date(event.createdAt))} /{" "}
              {event.actor?.email ?? "System"}
            </p>
            {typeof status === "string" && (
              <p className="mt-1 text-xs">
                Status: {status.replaceAll("_", " ")}
              </p>
            )}
            {typeof reason === "string" && (
              <p className="mt-1 text-xs text-destructive">Reason: {reason}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function auditActionLabel(action: string) {
  return action
    .replace(/^SALE_LISTING_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
