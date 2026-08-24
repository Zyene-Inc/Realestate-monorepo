"use client";

import type { FormEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type {
  RentalProperty,
  RentalPropertyForm,
} from "./rental-property-types";

const identityFields = [
  ["name", "Property name"],
  ["propertyType", "Property type"],
  ["address", "Street address"],
  ["city", "City"],
  ["state", "State"],
  ["zip", "ZIP code"],
] as const;

const detailFields = [
  ["rentAmount", "Monthly rent", "number"],
  ["bedrooms", "Bedrooms", "number"],
  ["bathrooms", "Bathrooms", "number"],
  ["squareFeet", "Square feet", "number"],
  ["availabilityDate", "Available date", "date"],
  ["amenities", "Amenities (comma separated)", "text"],
] as const;

export function RentalPropertyDialog({
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
  form: RentalPropertyForm;
  busy: boolean;
  uploading: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: RentalPropertyForm) => void;
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
            {editing
              ? "Update rental details or add listing photos. Public visibility changes only when you use Publish."
              : "This private draft is not public. Save it first, then select Edit & photos to upload listing images."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave} className="grid gap-5 sm:grid-cols-2">
          {editing ? (
            <section
              aria-labelledby="rental-photos-heading"
              className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2"
            >
              <div>
                <h2 id="rental-photos-heading" className="font-semibold">
                  Listing photos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editing.photos.length === 0
                    ? "Add at least one clear exterior or interior photo before publishing."
                    : `${editing.photos.length} photo${editing.photos.length === 1 ? "" : "s"} uploaded.`}
                </p>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card px-4 text-sm font-semibold hover:bg-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 size-4" />
                )}
                {uploading ? "Uploading photo" : "Upload photo"}
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
            </section>
          ) : null}
          {identityFields.map(([field, label]) => (
            <div
              key={field}
              className={`grid gap-2 ${
                field === "address" ? "sm:col-span-2" : ""
              }`}
            >
              <Label htmlFor={`property-${field}`}>{label}</Label>
              <Input
                id={`property-${field}`}
                value={form[field]}
                onChange={(event) =>
                  onFormChange({ ...form, [field]: event.target.value })
                }
                required
              />
            </div>
          ))}
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="property-description">Description</Label>
            <Textarea
              id="property-description"
              className="min-h-28"
              value={form.description}
              onChange={(event) =>
                onFormChange({ ...form, description: event.target.value })
              }
              required
            />
          </div>
          {detailFields.map(([field, label, type]) => (
            <div key={field} className="grid gap-2">
              <Label htmlFor={`property-${field}`}>{label}</Label>
              <Input
                id={`property-${field}`}
                type={type}
                min={type === "number" ? 0 : undefined}
                value={form[field]}
                onChange={(event) =>
                  onFormChange({ ...form, [field]: event.target.value })
                }
              />
            </div>
          ))}
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="property-utilities">Utility information</Label>
            <Textarea
              id="property-utilities"
              value={form.utilityInfo}
              onChange={(event) =>
                onFormChange({ ...form, utilityInfo: event.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="property-status">Availability status</Label>
            <select
              id="property-status"
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
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
