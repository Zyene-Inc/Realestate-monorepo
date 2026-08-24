"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  Clock,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
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

type Property = { id: string; name: string };
type Unit = {
  id: string;
  propertyId: string;
  unitNumber: string;
  property: Property;
};
type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  property: Property | null;
  unit: { id: string; unitNumber: string } | null;
};

const initialForm = {
  title: "",
  content: "",
  audience: "all",
  propertyId: "",
  unitId: "",
};

function audienceLabel(announcement: Announcement) {
  if (announcement.unit) return `Unit ${announcement.unit.unitNumber}`;
  if (announcement.property) return announcement.property.name;
  return "All residents";
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    const [announcementRows, propertyRows, unitRows] = await Promise.all([
      api.get("/admin/announcements") as Promise<Announcement[]>,
      api.get("/admin/properties") as Promise<Property[]>,
      api.get("/admin/units") as Promise<Unit[]>,
    ]);
    setAnnouncements(announcementRows);
    setProperties(propertyRows);
    setUnits(unitRows);
  };

  useEffect(() => {
    Promise.all([
      api.get("/admin/announcements") as Promise<Announcement[]>,
      api.get("/admin/properties") as Promise<Property[]>,
      api.get("/admin/units") as Promise<Unit[]>,
    ])
      .then(([announcementRows, propertyRows, unitRows]) => {
        setAnnouncements(announcementRows);
        setProperties(propertyRows);
        setUnits(unitRows);
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load announcements")),
      )
      .finally(() => setLoading(false));
  }, []);

  const availableUnits = form.propertyId
    ? units.filter((unit) => unit.propertyId === form.propertyId)
    : units;

  function startCreate() {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  }

  function startEdit(announcement: Announcement) {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      audience: "locked",
      propertyId: "",
      unitId: "",
    });
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/announcements/${editing.id}`, {
          title: form.title.trim(),
          content: form.content.trim(),
        });
        toast.success("Announcement updated");
      } else {
        await api.post("/admin/announcements", {
          title: form.title.trim(),
          content: form.content.trim(),
          ...(form.audience === "property" && form.propertyId
            ? { propertyId: form.propertyId }
            : {}),
          ...(form.audience === "unit" && form.unitId
            ? { unitId: form.unitId }
            : {}),
        });
        toast.success("Announcement published");
      }
      await load();
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save announcement"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(announcement: Announcement) {
    if (
      !window.confirm(`Delete “${announcement.title}”? This cannot be undone.`)
    )
      return;
    setDeletingId(announcement.id);
    try {
      await api.delete(`/admin/announcements/${announcement.id}`);
      await load();
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete announcement"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            Resident communication
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Announcements
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Publish updates to all residents, one rental property, or an
            individual unit.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus aria-hidden="true" /> Create announcement
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone
              className="mx-auto size-10 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">No announcements yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first update when residents need to know something.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <Megaphone className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        {announcement.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <Building2 aria-hidden="true" />
                          {audienceLabel(announcement)}
                        </Badge>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5" aria-hidden="true" />
                          {new Date(announcement.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(announcement)}
                    >
                      <Pencil aria-hidden="true" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletingId === announcement.id}
                      onClick={() => remove(announcement)}
                    >
                      <Trash2 aria-hidden="true" />
                      {deletingId === announcement.id ? "Deleting" : "Delete"}
                    </Button>
                  </div>
                </div>
                <p className="mt-5 border-l-2 border-primary/30 pl-4 text-sm leading-6 text-muted-foreground">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={save} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit announcement" : "Create announcement"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? `This update is currently visible to ${audienceLabel(editing)}. Its audience stays fixed while editing.`
                  : "Choose exactly who should see this update."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Field label="Title" id="announcement-title">
                <Input
                  id="announcement-title"
                  required
                  minLength={3}
                  maxLength={140}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-2">
                <Label htmlFor="announcement-content">Message</Label>
                <textarea
                  id="announcement-content"
                  required
                  minLength={3}
                  maxLength={5000}
                  className="min-h-32 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                  value={form.content}
                  onChange={(event) =>
                    setForm({ ...form, content: event.target.value })
                  }
                />
              </div>
              {!editing ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-audience">Audience</Label>
                    <select
                      id="announcement-audience"
                      className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                      value={form.audience}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          audience: event.target.value,
                          propertyId: "",
                          unitId: "",
                        })
                      }
                    >
                      <option value="all">All residents</option>
                      <option value="property">One rental property</option>
                      <option value="unit">One rental unit</option>
                    </select>
                  </div>
                  {form.audience !== "all" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="announcement-property">
                        Rental property
                      </Label>
                      <select
                        id="announcement-property"
                        required
                        className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                        value={form.propertyId}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            propertyId: event.target.value,
                            unitId: "",
                          })
                        }
                      >
                        <option value="">Choose a property</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {form.audience === "unit" ? (
                    <div className="grid gap-2">
                      <Label htmlFor="announcement-unit">Rental unit</Label>
                      <select
                        id="announcement-unit"
                        required
                        className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                        value={form.unitId}
                        onChange={(event) =>
                          setForm({ ...form, unitId: event.target.value })
                        }
                      >
                        <option value="">Choose a unit</option>
                        {availableUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.property.name} · Unit {unit.unitNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                {editing ? "Save changes" : "Publish announcement"}
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
