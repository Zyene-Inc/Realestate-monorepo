"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { RentalProperty } from "./rental-property-types";

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 10 * 1024 * 1024;

export function useRentalPhotoManager({
  editing,
  onPropertyChange,
}: {
  editing: RentalProperty | null;
  onPropertyChange: (property: RentalProperty) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [photoActionIndex, setPhotoActionIndex] = useState<number | null>(null);
  const [photoPendingDelete, setPhotoPendingDelete] = useState<number | null>(
    null,
  );

  const uploadPhotos = async (files: File[]) => {
    if (files.length === 0 || !editing) return;
    const invalidFile = files.find(
      (file) => file.size > maxPhotoBytes || !allowedPhotoTypes.has(file.type),
    );
    if (invalidFile) {
      toast.error(
        `${invalidFile.name} must be a JPEG, PNG, or WebP no larger than 10 MB`,
      );
      return;
    }

    setUploading(true);
    try {
      const uploadAt = async (index: number): Promise<void> => {
        const file = files[index];
        if (!file) return;
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
        onPropertyChange(updated);
        await uploadAt(index + 1);
      };

      await uploadAt(0);
      toast.success(
        `${files.length} rental photo${files.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to upload rental photos"));
    } finally {
      setUploading(false);
    }
  };

  const movePhoto = async (fromIndex: number, toIndex: number) => {
    if (!editing) return;
    setPhotoActionIndex(fromIndex);
    try {
      const updated = (await api.patch(
        `/admin/properties/${editing.id}/photos/order`,
        { fromIndex, toIndex },
      )) as RentalProperty;
      onPropertyChange(updated);
      toast.success(
        toIndex === 0 ? "Cover photo updated" : "Photo order updated",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to reorder rental photos"));
    } finally {
      setPhotoActionIndex(null);
    }
  };

  const removePhoto = async () => {
    if (!editing || photoPendingDelete === null) return;
    const deletingIndex = photoPendingDelete;
    setPhotoActionIndex(deletingIndex);
    try {
      const updated = (await api.delete(
        `/admin/properties/${editing.id}/photos/${deletingIndex}`,
      )) as RentalProperty;
      onPropertyChange(updated);
      setPhotoPendingDelete(null);
      toast.success("Rental photo removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to remove rental photo"));
    } finally {
      setPhotoActionIndex(null);
    }
  };

  return {
    uploading,
    photoActionIndex,
    photoPendingDelete,
    setPhotoPendingDelete,
    uploadPhotos,
    movePhoto,
    removePhoto,
  };
}
