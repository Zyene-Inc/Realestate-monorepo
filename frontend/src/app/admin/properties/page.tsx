"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

type RentalProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description: string | null;
  rentAmount: string | number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  availabilityDate: string | null;
  amenities: string[];
  utilityInfo: string | null;
  photos: string[];
  status: "active" | "rented" | "inactive";
  publishStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  units: Array<{ id: string; status: string }>;
};

type PropertyForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description: string;
  rentAmount: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  availabilityDate: string;
  amenities: string;
  utilityInfo: string;
  status: RentalProperty["status"];
};

const emptyForm: PropertyForm = {
  name: "",
  address: "",
  city: "",
  state: "MO",
  zip: "",
  propertyType: "Single Family",
  description: "",
  rentAmount: "",
  bedrooms: "",
  bathrooms: "",
  squareFeet: "",
  availabilityDate: "",
  amenities: "",
  utilityInfo: "",
  status: "active",
};

function formFor(property?: RentalProperty): PropertyForm {
  if (!property) return { ...emptyForm };
  return {
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zip,
    propertyType: property.propertyType,
    description: property.description ?? "",
    rentAmount: property.rentAmount == null ? "" : String(property.rentAmount),
    bedrooms: property.bedrooms == null ? "" : String(property.bedrooms),
    bathrooms: property.bathrooms == null ? "" : String(property.bathrooms),
    squareFeet: property.squareFeet == null ? "" : String(property.squareFeet),
    availabilityDate: property.availabilityDate?.slice(0, 10) ?? "",
    amenities: property.amenities.join(", "),
    utilityInfo: property.utilityInfo ?? "",
    status: property.status,
  };
}

function RentalPropertyGrid({
  properties,
  busy,
  onEdit,
  onPublishChange,
}: {
  properties: RentalProperty[];
  busy: boolean;
  onEdit: (property: RentalProperty) => void;
  onPublishChange: (property: RentalProperty) => Promise<void>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {properties.map((property) => (
        <Card key={property.id} className="overflow-hidden">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[9rem_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
              {property.photos[0] ? (
                <Image
                  src={property.photos[0]}
                  alt={`${property.name} exterior`}
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              ) : (
                <Building2 className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{property.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {property.address}, {property.city}, {property.state}
                  </p>
                </div>
                <Badge
                  variant={
                    property.publishStatus === "PUBLISHED"
                      ? "default"
                      : "outline"
                  }
                >
                  {property.publishStatus.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {property.units.length} units · {property.status}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(property)}
                >
                  <Pencil aria-hidden="true" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant={
                    property.publishStatus === "PUBLISHED"
                      ? "outline"
                      : "default"
                  }
                  disabled={busy}
                  onClick={() => void onPublishChange(property)}
                >
                  {property.publishStatus === "PUBLISHED" ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                  {property.publishStatus === "PUBLISHED"
                    ? "Unpublish"
                    : "Publish"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RentalPropertyDialog({
  open,
  editing,
  form,
  busy,
  uploading,
  onOpenChange,
  onFormChange,
  onSave,
  onUploadPhoto,
}: {
  open: boolean;
  editing: RentalProperty | null;
  form: PropertyForm;
  busy: boolean;
  uploading: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: PropertyForm) => void;
  onSave: (event: FormEvent) => Promise<void>;
  onUploadPhoto: (file?: File) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit rental" : "Create rental draft"}
          </DialogTitle>
          <DialogDescription>
            Public visibility changes only when you use the Publish action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave} className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["name", "Property name"],
              ["propertyType", "Property type"],
              ["address", "Street address"],
              ["city", "City"],
              ["state", "State"],
              ["zip", "ZIP code"],
            ] as const
          ).map(([field, label]) => (
            <div
              key={field}
              className={field === "address" ? "sm:col-span-2" : ""}
            >
              <Label htmlFor={`property-${field}`}>{label}</Label>
              <Input
                id={`property-${field}`}
                className="mt-2"
                value={form[field]}
                onChange={(event) =>
                  onFormChange({ ...form, [field]: event.target.value })
                }
                required
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="property-description">Description</Label>
            <Textarea
              id="property-description"
              className="mt-2 min-h-28"
              value={form.description}
              onChange={(event) =>
                onFormChange({ ...form, description: event.target.value })
              }
              required
            />
          </div>
          {(
            [
              ["rentAmount", "Monthly rent", "number"],
              ["bedrooms", "Bedrooms", "number"],
              ["bathrooms", "Bathrooms", "number"],
              ["squareFeet", "Square feet", "number"],
              ["availabilityDate", "Available date", "date"],
              ["amenities", "Amenities (comma separated)", "text"],
            ] as const
          ).map(([field, label, type]) => (
            <div key={field}>
              <Label htmlFor={`property-${field}`}>{label}</Label>
              <Input
                id={`property-${field}`}
                type={type}
                min={type === "number" ? 0 : undefined}
                className="mt-2"
                value={form[field]}
                onChange={(event) =>
                  onFormChange({ ...form, [field]: event.target.value })
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="property-utilities">Utility information</Label>
            <Textarea
              id="property-utilities"
              className="mt-2"
              value={form.utilityInfo}
              onChange={(event) =>
                onFormChange({ ...form, utilityInfo: event.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="property-status">Availability status</Label>
            <select
              id="property-status"
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  status: event.target.value as RentalProperty["status"],
                })
              }
            >
              <option value="active">Active</option>
              <option value="rented">Rented</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {editing ? (
            <div>
              <Label>Property photos</Label>
              <label className="mt-2 flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-input px-4 text-sm font-semibold hover:bg-secondary">
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 size-4" />
                )}
                Upload photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) =>
                    void onUploadPhoto(event.target.files?.[0])
                  }
                />
              </label>
            </div>
          ) : null}
          <div className="flex justify-end gap-3 border-t border-border pt-5 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {editing ? "Save changes" : "Create draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProperties() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RentalProperty | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);

  const load = async () => {
    try {
      setProperties((await api.get("/admin/properties")) as RentalProperty[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load rental properties"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api
      .get("/admin/properties")
      .then((rows: RentalProperty[]) => setProperties(rows))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load rental properties")),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter((property) =>
      [property.name, property.address, property.city, property.state].some(
        (value) => value.toLowerCase().includes(term),
      ),
    );
  }, [properties, query]);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const startEdit = (property: RentalProperty) => {
    setEditing(property);
    setForm(formFor(property));
    setOpen(true);
  };

  const payload = () => ({
    ...form,
    rentAmount: form.rentAmount ? Number(form.rentAmount) : undefined,
    bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
    bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
    squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
    availabilityDate: form.availabilityDate
      ? new Date(form.availabilityDate).toISOString()
      : undefined,
    amenities: form.amenities
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    utilityInfo: form.utilityInfo || undefined,
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const property = editing
        ? ((await api.patch(
            `/admin/properties/${editing.id}`,
            payload(),
          )) as RentalProperty)
        : ((await api.post("/admin/properties", payload())) as RentalProperty);
      setEditing(property);
      setForm(formFor(property));
      toast.success(editing ? "Rental updated" : "Rental draft created");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to save rental"));
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file?: File) => {
    if (!file || !editing) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photos must be 10 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const signed = (await api.post(
        `/admin/properties/${editing.id}/photo-upload-url`,
        { fileName: file.name, contentType: file.type },
      )) as { bucket: string; path: string; token: string };
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;
      const updated = (await api.post(
        `/admin/properties/${editing.id}/photos`,
        { path: signed.path },
      )) as RentalProperty;
      setEditing(updated);
      toast.success("Rental photo uploaded");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to upload photo"));
    } finally {
      setUploading(false);
    }
  };

  const changePublishState = async (property: RentalProperty) => {
    const action =
      property.publishStatus === "PUBLISHED" ? "unpublish" : "publish";
    setBusy(true);
    try {
      await api.post(`/admin/properties/${property.id}/${action}`, {});
      toast.success(
        action === "publish" ? "Rental is now public" : "Rental unpublished",
      );
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Unable to ${action} rental`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            Direct publishing
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Rental properties
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Draft, publish, update, or unpublish rentals without an approval
            queue.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus aria-hidden="true" /> Add rental
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search rental properties"
          className="pl-11"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search property or location"
        />
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2
            className="size-7 animate-spin text-primary"
            aria-hidden="true"
          />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2
              className="mx-auto size-10 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">
              No rental properties found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first rental draft to start the leasing workflow.
            </p>
          </CardContent>
        </Card>
      ) : (
        <RentalPropertyGrid
          properties={filtered}
          busy={busy}
          onEdit={startEdit}
          onPublishChange={changePublishState}
        />
      )}

      <RentalPropertyDialog
        open={open}
        editing={editing}
        form={form}
        busy={busy}
        uploading={uploading}
        onOpenChange={setOpen}
        onFormChange={setForm}
        onSave={save}
        onUploadPhoto={uploadPhoto}
      />
    </div>
  );
}
