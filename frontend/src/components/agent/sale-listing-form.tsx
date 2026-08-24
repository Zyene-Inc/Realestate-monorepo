"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { listingStatusLabel, type SaleListing } from "@/lib/sale-listings";
import { supabase } from "@/lib/supabase";
import { ListingAvailabilityControl } from "@/components/agent/listing-availability-control";
import { SaleListingAssets } from "@/components/agent/sale-listing-assets";
import {
  SaleListingDetailsFields,
  type ListingFormState,
} from "@/components/agent/sale-listing-details-fields";

function initialState(listing?: SaleListing): ListingFormState {
  return {
    name: listing?.name ?? "",
    address: listing?.address ?? "",
    city: listing?.city ?? "",
    state: listing?.state ?? "",
    zip: listing?.zip ?? "",
    propertyType: listing?.propertyType ?? "Single Family",
    description: listing?.description ?? "",
    price: listing ? String(listing.price) : "",
    bedrooms: listing?.bedrooms == null ? "" : String(listing.bedrooms),
    bathrooms: listing?.bathrooms == null ? "" : String(listing.bathrooms),
    squareFeet: listing?.squareFeet == null ? "" : String(listing.squareFeet),
    amenities: listing?.amenities.join(", ") ?? "",
  };
}

export function SaleListingForm({ listing }: { listing?: SaleListing }) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(listing));
  const [current, setCurrent] = useState(listing);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<"photo" | "document" | null>(null);
  const [assetAction, setAssetAction] = useState<string | null>(null);
  const locked = current?.listingStatus === "PENDING_REVIEW";

  const update = (field: keyof ListingFormState, value: string) => {
    setForm((valueBefore) => ({ ...valueBefore, [field]: value }));
  };

  const payload = () => ({
    name: form.name,
    address: form.address,
    city: form.city,
    state: form.state,
    zip: form.zip,
    propertyType: form.propertyType,
    description: form.description,
    price: Number(form.price),
    bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
    bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
    squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
    amenities: form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    try {
      if (current) {
        const updated = await api.patch(
          `/agent/listings/${current.id}`,
          payload(),
        );
        setCurrent(updated);
        toast.success(
          current.listingStatus === "APPROVED"
            ? "Changes saved and returned for review"
            : "Draft saved",
        );
        return updated as SaleListing;
      }

      const created = (await api.post(
        "/agent/listings",
        payload(),
      )) as SaleListing;
      toast.success("Draft created. Add at least one photo before submitting.");
      router.replace(`/agent/listings/${created.id}`);
      return created;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to save listing"));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!current) return;
    setSubmitting(true);
    try {
      const updated = await api.post(
        `/agent/listings/${current.id}/submit`,
        {},
      );
      setCurrent(updated);
      toast.success("Listing submitted for Johnson Realty review");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to submit listing"));
    } finally {
      setSubmitting(false);
    }
  };

  const upload = async (kind: "photo" | "document", file?: File) => {
    if (!file || !current) return;
    const accepted =
      kind === "photo"
        ? ["image/jpeg", "image/png", "image/webp"]
        : ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!accepted.includes(file.type)) {
      toast.error(
        kind === "photo"
          ? "Photos must be JPEG, PNG, or WebP"
          : "Documents must be PDF, JPEG, PNG, or WebP",
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be 10 MB or smaller");
      return;
    }
    setUploading(kind);
    try {
      const signed = await api.post(
        `/agent/listings/${current.id}/upload-url`,
        {
          kind,
          fileName: file.name,
          contentType: file.type,
        },
      );
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;
      const updated = await api.post(`/agent/listings/${current.id}/assets`, {
        kind,
        path: signed.path,
      });
      setCurrent(updated);
      toast.success(kind === "photo" ? "Photo uploaded" : "Document uploaded");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to upload file"));
    } finally {
      setUploading(null);
    }
  };

  const openDocument = async (index: number) => {
    if (!current) return;
    try {
      const result = (await api.get(
        `/agent/listings/${current.id}/documents/${index}/url`,
      )) as { url: string };
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open document"));
    }
  };

  const movePhoto = async (fromIndex: number, toIndex: number) => {
    if (!current) return;
    setAssetAction(`photo-${fromIndex}`);
    try {
      const updated = (await api.patch(
        `/agent/listings/${current.id}/photos/order`,
        { fromIndex, toIndex },
      )) as SaleListing;
      setCurrent(updated);
      toast.success(
        toIndex === 0 ? "Cover photo updated" : "Photo order updated",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to reorder photos"));
    } finally {
      setAssetAction(null);
    }
  };

  const removeAsset = async (kind: "photo" | "document", index: number) => {
    if (!current) return;
    setAssetAction(`${kind}-${index}`);
    try {
      const endpoint = kind === "photo" ? "photos" : "documents";
      const updated = (await api.delete(
        `/agent/listings/${current.id}/${endpoint}/${index}`,
      )) as SaleListing;
      setCurrent(updated);
      toast.success(kind === "photo" ? "Photo removed" : "Document removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Unable to remove ${kind}`));
    } finally {
      setAssetAction(null);
    }
  };

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {current ? "Listing workspace" : "New sale listing"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {current?.name || "Create a draft"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {current?.listingStatus && (
            <Badge variant="outline">
              {listingStatusLabel(current.listingStatus)}
            </Badge>
          )}
          <Button type="submit" disabled={saving || locked}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {current ? "Save changes" : "Create draft"}
          </Button>
        </div>
      </div>

      {current?.rejectionReason && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          <strong>Changes requested:</strong> {current.rejectionReason}
        </div>
      )}
      {locked && (
        <div className="rounded-xl border border-warning/35 bg-warning/12 p-4 text-sm text-warning-foreground">
          Johnson Realty is reviewing this listing. Editing and uploads are
          locked until a decision is made.
        </div>
      )}
      {current?.listingStatus === "APPROVED" && (
        <ListingAvailabilityControl listing={current} onChange={setCurrent} />
      )}

      <SaleListingDetailsFields
        form={form}
        disabled={locked}
        onChange={update}
      />

      {current ? (
        <SaleListingAssets
          listing={current}
          locked={locked}
          uploading={uploading}
          assetAction={assetAction}
          onUpload={upload}
          onMovePhoto={movePhoto}
          onRemove={removeAsset}
          onOpenDocument={openDocument}
        />
      ) : null}

      {current &&
        ["DRAFT", "REJECTED"].includes(current.listingStatus ?? "") && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="lg"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit for review
            </Button>
          </div>
        )}
    </form>
  );
}
