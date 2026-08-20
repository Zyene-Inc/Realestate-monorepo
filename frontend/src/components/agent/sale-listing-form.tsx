"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  ImagePlus,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { listingStatusLabel, type SaleListing } from "@/lib/sale-listings";
import { supabase } from "@/lib/supabase";

type ListingFormState = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  amenities: string;
};

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

  return (
    <form onSubmit={save} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {current ? "Listing workspace" : "New sale listing"}
          </p>
          <h1 className="mt-2 text-4xl font-bold font-heading">
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Changes requested:</strong> {current.rejectionReason}
        </div>
      )}
      {locked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Johnson Realty is reviewing this listing. Editing and uploads are
          locked until a decision is made.
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Property details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Listing title">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              disabled={locked}
            />
          </Field>
          <Field label="Property type">
            <select
              value={form.propertyType}
              onChange={(e) => update("propertyType", e.target.value)}
              disabled={locked}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option>Single Family</option>
              <option>Condo</option>
              <option>Townhome</option>
              <option>Multi-Family</option>
              <option>Land</option>
              <option>Commercial</option>
            </select>
          </Field>
          <Field label="Street address" className="md:col-span-2">
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
              disabled={locked}
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              required
              disabled={locked}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                required
                disabled={locked}
              />
            </Field>
            <Field label="ZIP">
              <Input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                required
                disabled={locked}
              />
            </Field>
          </div>
          <Field label="Sale price">
            <Input
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              required
              disabled={locked}
            />
          </Field>
          <Field label="Square feet">
            <Input
              type="number"
              min="1"
              value={form.squareFeet}
              onChange={(e) => update("squareFeet", e.target.value)}
              disabled={locked}
            />
          </Field>
          <Field label="Bedrooms">
            <Input
              type="number"
              min="0"
              value={form.bedrooms}
              onChange={(e) => update("bedrooms", e.target.value)}
              disabled={locked}
            />
          </Field>
          <Field label="Bathrooms">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={form.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
              disabled={locked}
            />
          </Field>
          <Field label="Amenities (comma separated)" className="md:col-span-2">
            <Input
              value={form.amenities}
              onChange={(e) => update("amenities", e.target.value)}
              disabled={locked}
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={7}
              required
              disabled={locked}
            />
          </Field>
        </CardContent>
      </Card>

      {current && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Photos and review documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                {uploading === "photo" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 h-4 w-4" />
                )}
                Upload photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={Boolean(uploading) || locked}
                  onChange={(e) => void upload("photo", e.target.files?.[0])}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                {uploading === "document" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Upload private document
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={Boolean(uploading) || locked}
                  onChange={(e) => void upload("document", e.target.files?.[0])}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {current.photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo}
                  src={photo}
                  alt="Listing"
                  className="h-40 w-full rounded-xl object-cover"
                />
              ))}
            </div>
            {current.documents?.length ? (
              <div className="flex flex-wrap gap-2">
                {current.documents.map((_, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openDocument(index)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Document {index + 1}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No private review documents attached.
              </p>
            )}
          </CardContent>
        </Card>
      )}

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

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
