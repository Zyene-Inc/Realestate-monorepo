"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SaleListing } from "@/lib/sale-listings";

type AssetKind = "photo" | "document";

export function SaleListingAssets({
  listing,
  locked,
  uploading,
  assetAction,
  onUpload,
  onMovePhoto,
  onRemove,
  onOpenDocument,
}: {
  listing: SaleListing;
  locked: boolean;
  uploading: AssetKind | null;
  assetAction: string | null;
  onUpload: (kind: AssetKind, file?: File) => Promise<void>;
  onMovePhoto: (fromIndex: number, toIndex: number) => Promise<void>;
  onRemove: (kind: AssetKind, index: number) => Promise<void>;
  onOpenDocument: (index: number) => Promise<void>;
}) {
  const [pendingRemoval, setPendingRemoval] = useState<{
    kind: AssetKind;
    index: number;
  } | null>(null);
  const controlsDisabled = locked || uploading !== null || assetAction !== null;
  const documents = listing.documents ?? [];

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Photos and review documents</CardTitle>
          <p className="text-sm text-muted-foreground">
            Arrange public photos and keep private supporting documents with the
            listing. The first photo is the public cover image.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <UploadControl
              kind="photo"
              label="Upload photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              uploading={uploading}
              disabled={controlsDisabled}
              onUpload={onUpload}
            />
            <UploadControl
              kind="document"
              label="Upload private document"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              uploading={uploading}
              disabled={controlsDisabled}
              onUpload={onUpload}
            />
          </div>

          {listing.photos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listing.photos.map((photo, index) => {
                const actionPending = assetAction === `photo-${index}`;
                return (
                  <figure
                    key={photo}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <div className="relative aspect-[4/3] bg-secondary">
                      <Image
                        src={photo}
                        alt={`${listing.name} listing photo ${index + 1}`}
                        fill
                        sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                        className="object-cover"
                      />
                      {index === 0 ? (
                        <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                          Cover photo
                        </span>
                      ) : null}
                    </div>
                    <figcaption className="flex items-center justify-between gap-3 p-3">
                      <span className="text-sm font-medium">
                        Photo {index + 1}
                      </span>
                      <div className="flex gap-1">
                        <AssetButton
                          label={`Make photo ${index + 1} the cover photo`}
                          disabled={controlsDisabled || index === 0}
                          onClick={() => void onMovePhoto(index, 0)}
                        >
                          <Star />
                        </AssetButton>
                        <AssetButton
                          label={`Move photo ${index + 1} earlier`}
                          disabled={controlsDisabled || index === 0}
                          onClick={() => void onMovePhoto(index, index - 1)}
                        >
                          <ChevronLeft />
                        </AssetButton>
                        <AssetButton
                          label={`Move photo ${index + 1} later`}
                          disabled={
                            controlsDisabled ||
                            index === listing.photos.length - 1
                          }
                          onClick={() => void onMovePhoto(index, index + 1)}
                        >
                          <ChevronRight />
                        </AssetButton>
                        <AssetButton
                          label={`Remove photo ${index + 1}`}
                          disabled={controlsDisabled}
                          destructive
                          onClick={() =>
                            setPendingRemoval({ kind: "photo", index })
                          }
                        >
                          {actionPending ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                        </AssetButton>
                      </div>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No photos yet. Add at least one clear image before submitting for
              review.
            </p>
          )}

          {documents.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {documents.map((documentPath, index) => (
                <div
                  key={documentPath}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border px-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    Private document {index + 1}
                  </span>
                  <div className="flex gap-1">
                    <AssetButton
                      label={`Open private document ${index + 1}`}
                      disabled={assetAction !== null}
                      onClick={() => void onOpenDocument(index)}
                    >
                      <Download />
                    </AssetButton>
                    <AssetButton
                      label={`Remove private document ${index + 1}`}
                      disabled={controlsDisabled}
                      destructive
                      onClick={() =>
                        setPendingRemoval({ kind: "document", index })
                      }
                    >
                      {assetAction === `document-${index}` ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </AssetButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No private review documents attached.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove this {pendingRemoval?.kind ?? "asset"}?
            </DialogTitle>
            <DialogDescription>
              It will be removed from the listing and deleted from secure
              storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              type="button"
              variant="destructive"
              disabled={assetAction !== null}
              onClick={async () => {
                if (!pendingRemoval) return;
                await onRemove(pendingRemoval.kind, pendingRemoval.index);
                setPendingRemoval(null);
              }}
            >
              {assetAction ? <Loader2 className="animate-spin" /> : null}
              Remove {pendingRemoval?.kind ?? "asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UploadControl({
  kind,
  label,
  accept,
  multiple = false,
  uploading,
  disabled,
  onUpload,
}: {
  kind: AssetKind;
  label: string;
  accept: string;
  multiple?: boolean;
  uploading: AssetKind | null;
  disabled: boolean;
  onUpload: (kind: AssetKind, file?: File) => Promise<void>;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-input bg-card px-5 text-sm font-semibold transition-colors hover:bg-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      {uploading === kind ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : kind === "photo" ? (
        <ImagePlus className="mr-2 h-4 w-4" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      {uploading === kind ? "Uploading" : label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void uploadSequentially(files, (file) => onUpload(kind, file));
        }}
      />
    </label>
  );
}

async function uploadSequentially(
  files: File[],
  upload: (file: File) => Promise<void>,
  index = 0,
): Promise<void> {
  const file = files[index];
  if (!file) return;
  await upload(file);
  await uploadSequentially(files, upload, index + 1);
}

function AssetButton({
  label,
  disabled,
  destructive = false,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        destructive
          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
          : undefined
      }
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
