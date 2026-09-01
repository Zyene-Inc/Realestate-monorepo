"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { MoveInInspection } from "@/lib/move-in-inspections";
import { supabase } from "@/lib/supabase";

type Props = {
  inspection: MoveInInspection;
  endpointBase: string;
  editable: boolean;
  onUpdated: (inspection: MoveInInspection) => void;
  removableSource: "STAFF" | "TENANT";
};

export function InspectionPhotoPanel({
  inspection,
  endpointBase,
  editable,
  onUpdated,
  removableSource,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState("general");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const targets = useMemo(
    () => [
      { value: "general", label: "Whole-home overview" },
      ...inspection.areas.flatMap((area) =>
        area.items.map((item) => ({
          value: `item:${item.id}`,
          label: `${area.name}: ${item.name}`,
        })),
      ),
      ...inspection.meterReadings.map((meter) => ({
        value: `meter:${meter.id}`,
        label: `Meter: ${meter.label}`,
      })),
    ],
    [inspection.areas, inspection.meterReadings],
  );

  useEffect(() => {
    let active = true;
    Promise.all(
      inspection.photos.map(async (photo) => {
        const response = (await api.get(
          `${endpointBase}/photos/${photo.id}/url`,
        )) as { url: string };
        return [photo.id, response.url] as const;
      }),
    )
      .then((entries) => {
        if (active) setUrls(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) setUrls({});
      });
    return () => {
      active = false;
    };
  }, [endpointBase, inspection.photos]);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const signed = (await api.post(`${endpointBase}/photo-upload-url`, {
        expectedRevision: inspection.revision,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })) as { bucket: string; path: string; token: string };
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;
      const [kind, id] = target.split(":");
      const updated = (await api.post(`${endpointBase}/photos`, {
        expectedRevision: inspection.revision,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        path: signed.path,
        caption: caption.trim() || undefined,
        itemId: kind === "item" ? id : undefined,
        meterReadingId: kind === "meter" ? id : undefined,
      })) as MoveInInspection;
      onUpdated(updated);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Inspection photo added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add inspection photo"));
    } finally {
      setUploading(false);
    }
  }

  async function remove(photoId: string) {
    setRemoving(photoId);
    try {
      const updated = (await api.delete(`${endpointBase}/photos/${photoId}`, {
        expectedRevision: inspection.revision,
      })) as MoveInInspection;
      onUpdated(updated);
      toast.success("Inspection photo removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove inspection photo"));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="inspection-photos-title">
      <div>
        <h3 id="inspection-photos-title" className="text-lg font-semibold">
          Photo evidence
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Photos remain private. Each link expires after five minutes.
        </p>
      </div>

      {editable ? (
        <div className="grid gap-4 rounded-2xl border border-border bg-secondary/25 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="inspection-photo-target">Attach to</Label>
            <select
              id="inspection-photo-target"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              {targets.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspection-photo-caption">Caption (optional)</Label>
            <Input
              id="inspection-photo-caption"
              value={caption}
              maxLength={240}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What this photo shows"
            />
          </div>
          <div>
            <Label htmlFor="inspection-photo-file" className="sr-only">
              Inspection photo file
            </Label>
            <input
              ref={inputRef}
              className="sr-only"
              id="inspection-photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              disabled={uploading}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <Button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {uploading ? "Uploading" : "Upload photo"}
            </Button>
          </div>
        </div>
      ) : null}

      {inspection.photos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {inspection.photos.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-[4/3] bg-secondary">
                {urls[photo.id] ? (
                  <Image
                    src={urls[photo.id]}
                    alt={photo.caption || "Move-in condition evidence"}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Camera className="size-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {photo.caption || photo.originalFileName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {photo.source === "TENANT"
                      ? "Resident photo"
                      : "Staff photo"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {urls[photo.id] ? (
                    <a
                      className={buttonVariants({
                        size: "icon-sm",
                        variant: "ghost",
                      })}
                      aria-label="Open full inspection photo"
                      href={urls[photo.id]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink />
                    </a>
                  ) : null}
                  {editable && photo.source === removableSource ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remove inspection photo"
                      disabled={removing === photo.id}
                      onClick={() => void remove(photo.id)}
                    >
                      {removing === photo.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <Camera className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No inspection photos yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add clear overview and close-up photos where they help document
            condition.
          </p>
        </div>
      )}
    </section>
  );
}
