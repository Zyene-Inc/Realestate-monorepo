"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type Vendor = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  rating: number | null;
  notes: string | null;
  _count: { maintenanceRequests: number };
};

type VendorForm = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  specialty: string;
  rating: string;
  notes: string;
};

const emptyForm: VendorForm = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  specialty: "",
  rating: "",
  notes: "",
};

function formFor(vendor: Vendor): VendorForm {
  return {
    name: vendor.name,
    companyName: vendor.companyName ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    specialty: vendor.specialty ?? "",
    rating: vendor.rating?.toString() ?? "",
    notes: vendor.notes ?? "",
  };
}

function payloadFor(form: VendorForm, clearEmptyFields = false) {
  const optionalText = (value: string) =>
    value.trim() || (clearEmptyFields ? null : undefined);
  return {
    name: form.name.trim(),
    companyName: optionalText(form.companyName),
    email: optionalText(form.email),
    phone: optionalText(form.phone),
    specialty: optionalText(form.specialty),
    rating: form.rating
      ? Number(form.rating)
      : clearEmptyFields
        ? null
        : undefined,
    notes: optionalText(form.notes),
  };
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setVendors((await api.get("/admin/vendors")) as Vendor[]);
  };

  useEffect(() => {
    api
      .get("/admin/vendors")
      .then((rows: Vendor[]) => setVendors(rows))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load vendors")),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((vendor) =>
      [vendor.name, vendor.companyName, vendor.specialty, vendor.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, vendors]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditing(vendor);
    setForm(formFor(vendor));
    setDialogOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/vendors/${editing.id}`, payloadFor(form, true));
        toast.success("Vendor updated");
      } else {
        await api.post("/admin/vendors", payloadFor(form));
        toast.success("Vendor added");
      }
      await load();
      setDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save vendor"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(vendor: Vendor) {
    if (!window.confirm(`Delete ${vendor.name}? This cannot be undone.`))
      return;
    setDeletingId(vendor.id);
    try {
      await api.delete(`/admin/vendors/${vendor.id}`);
      await load();
      toast.success("Vendor deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete vendor"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Service network</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Vendors
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Maintain the service providers available for rental maintenance
            requests.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" /> Add vendor
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search vendors"
          className="pl-11"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, company, or specialty"
        />
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wrench
              className="mx-auto size-10 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">No vendors found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a provider before assigning them to a maintenance request.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((vendor) => (
            <Card key={vendor.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <Wrench className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">
                        {vendor.name}
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {vendor.companyName ??
                          vendor.email ??
                          "Independent provider"}
                      </p>
                    </div>
                  </div>
                  {vendor.specialty ? (
                    <Badge variant="outline">{vendor.specialty}</Badge>
                  ) : null}
                </div>
                <div className="mt-5 grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
                  <p className="text-muted-foreground">
                    {vendor.phone ?? "No phone recorded"}
                  </p>
                  <p className="text-muted-foreground">
                    {vendor.email ?? "No email recorded"}
                  </p>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className="size-4 text-primary" aria-hidden="true" />
                    {vendor.rating
                      ? `${vendor.rating.toFixed(1)} / 5`
                      : "No rating"}
                  </p>
                  <p className="text-muted-foreground">
                    {vendor._count.maintenanceRequests} maintenance request
                    {vendor._count.maintenanceRequests === 1 ? "" : "s"}
                  </p>
                </div>
                {vendor.notes ? (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {vendor.notes}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(vendor)}
                  >
                    <Pencil aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      deletingId === vendor.id ||
                      vendor._count.maintenanceRequests > 0
                    }
                    title={
                      vendor._count.maintenanceRequests > 0
                        ? "Assigned vendors cannot be deleted"
                        : undefined
                    }
                    onClick={() => remove(vendor)}
                  >
                    <Trash2 aria-hidden="true" />
                    {deletingId === vendor.id ? "Deleting" : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={save} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit vendor" : "Add vendor"}
              </DialogTitle>
              <DialogDescription>
                Keep contact details current so staff can assign the right
                provider to service requests.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vendor name" id="vendor-name">
                <Input
                  id="vendor-name"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </Field>
              <Field label="Company name" id="vendor-company">
                <Input
                  id="vendor-company"
                  value={form.companyName}
                  onChange={(event) =>
                    setForm({ ...form, companyName: event.target.value })
                  }
                />
              </Field>
              <Field label="Email" id="vendor-email">
                <Input
                  id="vendor-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>
              <Field label="Phone" id="vendor-phone">
                <Input
                  id="vendor-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </Field>
              <Field label="Specialty" id="vendor-specialty">
                <Input
                  id="vendor-specialty"
                  placeholder="For example: Plumbing"
                  value={form.specialty}
                  onChange={(event) =>
                    setForm({ ...form, specialty: event.target.value })
                  }
                />
              </Field>
              <Field label="Rating (0–5)" id="vendor-rating">
                <Input
                  id="vendor-rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(event) =>
                    setForm({ ...form, rating: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="vendor-notes">Internal notes</Label>
                <textarea
                  id="vendor-notes"
                  className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                {editing ? "Save changes" : "Add vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
