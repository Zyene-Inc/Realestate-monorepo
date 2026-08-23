"use client";

import { CircleCheck, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { SaleListing } from "@/lib/sale-listings";

export function ListingAvailabilityControl({
  listing,
  onChange,
}: {
  listing: SaleListing;
  onChange: (listing: SaleListing) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const sold = listing.status === "sold";

  async function updateAvailability() {
    const nextStatus = sold ? "active" : "sold";
    setUpdating(true);
    try {
      const updated = (await api.patch(
        `/agent/listings/${listing.id}/availability`,
        { status: nextStatus },
      )) as SaleListing;
      onChange(updated);
      toast.success(
        nextStatus === "sold" ? "Listing marked sold" : "Listing reopened",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to change availability"));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Public availability</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {sold
            ? "This property remains public with a Sold label and no buyer inquiry form."
            : "This property is currently presented as available for sale."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={updateAvailability}
        disabled={updating}
        className="shrink-0"
      >
        {sold ? (
          <Undo2 className="mr-2 h-4 w-4" />
        ) : (
          <CircleCheck className="mr-2 h-4 w-4" />
        )}
        {updating ? "Updating" : sold ? "Reopen listing" : "Mark as sold"}
      </Button>
    </div>
  );
}
