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
            Public visibility changes only when you use the Publish action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave} className="grid gap-5 sm:grid-cols-2">
          {identityFields.map(([field, label]) => (
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
          {detailFields.map(([field, label, type]) => (
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
