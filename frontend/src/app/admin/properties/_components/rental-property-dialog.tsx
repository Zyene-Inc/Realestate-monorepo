"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
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
  ["applicationFeeAmount", "Application fee", "number"],
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
  photoActionIndex,
  onOpenChange,
  onFormChange,
  onSave,
  onUploadPhotos,
  onMovePhoto,
  onRemovePhoto,
}: {
  open: boolean;
  editing: RentalProperty | null;
  form: RentalPropertyForm;
  busy: boolean;
  uploading: boolean;
  photoActionIndex: number | null;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: RentalPropertyForm) => void;
  onSave: (event: FormEvent) => Promise<void>;
  onUploadPhotos: (files: File[]) => Promise<void>;
  onMovePhoto: (fromIndex: number, toIndex: number) => Promise<void>;
  onRemovePhoto: (photoIndex: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border px-5 py-5 pr-14 sm:px-6">
          <DialogTitle>
            {editing ? "Edit rental" : "Create rental draft"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update rental details and manage the photos visitors will see. Public visibility changes only when you use Publish."
              : "This private draft is not public. Save it first, then select Edit & photos to upload listing images."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSave}
          className="grid min-h-0 gap-5 overflow-y-auto overscroll-contain px-5 py-5 sm:grid-cols-2 sm:px-6"
        >
          {editing ? (
            <section
              aria-labelledby="rental-photos-heading"
              className="grid gap-4 border-b border-border pb-5 sm:col-span-2"
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

              {editing.photos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {editing.photos.map((photo, index) => {
                    const actionPending = photoActionIndex === index;
                    return (
                      <figure
                        key={photo}
                        className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <div className="relative aspect-[4/3] bg-secondary">
                          <Image
                            src={photo}
                            alt={`${editing.name} listing photo ${index + 1}`}
                            fill
                            sizes="(max-width: 640px) calc(100vw - 4rem), 360px"
                            className="object-cover"
                          />
                          {index === 0 ? (
                            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                              Cover photo
                            </span>
                          ) : null}
                        </div>
                        <figcaption className="flex flex-wrap items-center justify-between gap-3 p-3">
                          <span className="text-sm font-medium">
                            Photo {index + 1}
                          </span>
                          <div
                            className="flex flex-wrap gap-1"
                            aria-label={`Actions for photo ${index + 1}`}
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={
                                index === 0 || photoActionIndex !== null
                              }
                              aria-label={`Make photo ${index + 1} the cover photo`}
                              title="Make cover photo"
                              onClick={() => void onMovePhoto(index, 0)}
                            >
                              {actionPending && index !== 0 ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Star />
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={
                                index === 0 || photoActionIndex !== null
                              }
                              aria-label={`Move photo ${index + 1} earlier`}
                              title="Move earlier"
                              onClick={() => void onMovePhoto(index, index - 1)}
                            >
                              <ChevronLeft />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={
                                index === editing.photos.length - 1 ||
                                photoActionIndex !== null
                              }
                              aria-label={`Move photo ${index + 1} later`}
                              title="Move later"
                              onClick={() => void onMovePhoto(index, index + 1)}
                            >
                              <ChevronRight />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={photoActionIndex !== null}
                              aria-label={`Remove photo ${index + 1}`}
                              title="Remove photo"
                              onClick={() => onRemovePhoto(index)}
                            >
                              {actionPending ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Trash2 />
                              )}
                            </Button>
                          </div>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              ) : null}

              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card px-4 text-sm font-semibold hover:bg-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 size-4" />
                )}
                {uploading ? "Uploading photos" : "Upload photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={uploading || photoActionIndex !== null}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    void onUploadPhotos(files);
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Up to 10 MB each. The first photo is the
                public cover image.
              </p>
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

          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-border bg-popover px-5 py-4 sm:col-span-2 sm:-mx-6 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={busy || uploading || photoActionIndex !== null}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {editing ? "Save changes" : "Create draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
