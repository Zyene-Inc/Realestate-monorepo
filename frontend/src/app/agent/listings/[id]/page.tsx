"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SaleListingForm } from "@/components/agent/sale-listing-form";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { SaleListing } from "@/lib/sale-listings";

export default function EditSaleListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<SaleListing | null>(null);

  useEffect(() => {
    api
      .get(`/agent/listings/${id}`)
      .then(setListing)
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load listing")),
      );
  }, [id]);

  if (!listing) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/agent/listings"
        className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to listings
      </Link>
      <SaleListingForm listing={listing} />
    </div>
  );
}
