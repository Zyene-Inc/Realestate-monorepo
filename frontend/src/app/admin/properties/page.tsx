"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { RentalPropertyDialog } from "./_components/rental-property-dialog";
import { RentalPropertyGrid } from "./_components/rental-property-grid";
import {
  emptyRentalPropertyForm,
  rentalPropertyFormFor,
  type RentalProperty,
  type RentalPropertyForm,
} from "./_components/rental-property-types";

function propertyPayload(form: RentalPropertyForm) {
  return {
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
  };
}

export default function AdminProperties() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RentalProperty | null>(null);
  const [form, setForm] = useState<RentalPropertyForm>(
    emptyRentalPropertyForm,
  );

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
    let ignore = false;
    void api
      .get("/admin/properties")
      .then((rows: RentalProperty[]) => {
        if (!ignore) setProperties(rows);
      })
      .catch((error: unknown) => {
        if (!ignore) {
          toast.error(
            getErrorMessage(error, "Unable to load rental properties"),
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
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
    setForm({ ...emptyRentalPropertyForm });
    setOpen(true);
  };

  const startEdit = (property: RentalProperty) => {
    setEditing(property);
    setForm(rentalPropertyFormFor(property));
    setOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const property = editing
        ? ((await api.patch(
            `/admin/properties/${editing.id}`,
            propertyPayload(form),
          )) as RentalProperty)
        : ((await api.post(
            "/admin/properties",
            propertyPayload(form),
          )) as RentalProperty);
      setEditing(property);
      setForm(rentalPropertyFormFor(property));
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
