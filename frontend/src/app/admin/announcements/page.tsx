"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
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
import { useAuth } from "@/context/auth-context";

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
  audience: "TENANT" | "AGENT";
  requiresAcknowledgement: boolean;
  _count: { acknowledgements: number };
  property: Property | null;
  unit: { id: string; unitNumber: string } | null;
};

type AnnouncementForm = {
  title: string;
  content: string;
  audience: "all" | "property" | "unit" | "agents" | "locked";
  propertyId: string;
  unitId: string;
  requiresAcknowledgement: boolean;
};

const initialForm: AnnouncementForm = {
  title: "",
  content: "",
  audience: "all",
  propertyId: "",
  unitId: "",
  requiresAcknowledgement: false,
};

function audienceLabel(announcement: Announcement) {
  if (announcement.audience === "AGENT") return "All approved agents";
  if (announcement.unit) return `Unit ${announcement.unit.unitNumber}`;
  if (announcement.property) return announcement.property.name;
  return "All residents";
}

export default function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canManageTenantNotices = user?.role !== "SALES_ADMIN";

  const load = useCallback(async () => {
    const announcementRows = (await api.get(
      "/admin/announcements",
    )) as Announcement[];
    if (!canManageTenantNotices) {
      setAnnouncements(announcementRows);
      setProperties([]);
      setUnits([]);
      return;
    }
    const [propertyRows, unitRows] = await Promise.all([
      api.get("/admin/properties") as Promise<Property[]>,
      api.get("/admin/units") as Promise<Unit[]>,
    ]);
    setAnnouncements(announcementRows);
    setProperties(propertyRows);
    setUnits(unitRows);
  }, [canManageTenantNotices]);

  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(() => {
      setLoading(true);
      return load()
        .catch((error: unknown) =>
          toast.error(getErrorMessage(error, "Unable to load announcements")),
        )
        .finally(() => setLoading(false));
    });
  }, [load, user]);

  function startCreate() {
    setEditing(null);
    setForm({
      ...initialForm,
      audience: canManageTenantNotices ? "all" : "agents",
    });
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
      requiresAcknowledgement: announcement.requiresAcknowledgement,
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
          audience: form.audience === "agents" ? "AGENT" : "TENANT",
          requiresAcknowledgement: form.requiresAcknowledgement,
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
            Publish tenant or approved-agent updates, with acknowledgement when
            a response is required.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus aria-hidden="true" /> Create announcement
        </Button>
      </div>

      <AnnouncementsList
        announcements={announcements}
        deletingId={deletingId}
        loading={loading}
        onEdit={startEdit}
        onRemove={remove}
      />
      <AnnouncementEditor
        canManageTenantNotices={canManageTenantNotices}
        editing={editing}
        form={form}
        onFormChange={setForm}
        onOpenChange={setOpen}
        onSave={save}
        open={open}
        properties={properties}
        saving={saving}
        units={units}
      />
    </div>
  );
}

function AnnouncementsList({
  announcements,
  deletingId,
  loading,
  onEdit,
  onRemove,
}: {
  announcements: Announcement[];
  deletingId: string | null;
  loading: boolean;
  onEdit: (announcement: Announcement) => void;
  onRemove: (announcement: Announcement) => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  if (announcements.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid gap-4">
      {announcements.map((announcement) => (
        <AnnouncementCard
          announcement={announcement}
          deleting={deletingId === announcement.id}
          key={announcement.id}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  deleting,
  onEdit,
  onRemove,
}: {
  announcement: Announcement;
  deleting: boolean;
  onEdit: (announcement: Announcement) => void;
  onRemove: (announcement: Announcement) => void;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Megaphone className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{announcement.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Building2 aria-hidden="true" />
                  {audienceLabel(announcement)}
                </Badge>
                {announcement.requiresAcknowledgement ? (
                  <Badge variant="outline">
                    {announcement._count.acknowledgements} acknowledged
                  </Badge>
                ) : null}
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {format(
                    new Date(announcement.createdAt),
                    "MMM d, yyyy h:mm a",
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(announcement)}
            >
              <Pencil aria-hidden="true" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => onRemove(announcement)}
            >
              <Trash2 aria-hidden="true" />
              {deleting ? "Deleting" : "Delete"}
            </Button>
          </div>
        </div>
        <p className="mt-5 border-l-2 border-primary/30 pl-4 text-sm leading-6 text-muted-foreground">
          {announcement.content}
        </p>
      </CardContent>
    </Card>
  );
}

function AnnouncementEditor({
  canManageTenantNotices,
  editing,
  form,
  onFormChange,
  onOpenChange,
  onSave,
  open,
  properties,
  saving,
  units,
}: {
  canManageTenantNotices: boolean;
  editing: Announcement | null;
  form: AnnouncementForm;
  onFormChange: (form: AnnouncementForm) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  open: boolean;
  properties: Property[];
  saving: boolean;
  units: Unit[];
}) {
  const availableUnits = form.propertyId
    ? units.filter((unit) => unit.propertyId === form.propertyId)
    : units;
  const showPropertySelector =
    form.audience !== "all" && form.audience !== "agents";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={onSave} className="grid gap-5">
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
                  onFormChange({ ...form, title: event.target.value })
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
                  onFormChange({ ...form, content: event.target.value })
                }
              />
            </div>
            {!editing ? (
              <AnnouncementAudienceFields
                availableUnits={availableUnits}
                canManageTenantNotices={canManageTenantNotices}
                form={form}
                onFormChange={onFormChange}
                properties={properties}
                showPropertySelector={showPropertySelector}
              />
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
  );
}

function AnnouncementAudienceFields({
  availableUnits,
  canManageTenantNotices,
  form,
  onFormChange,
  properties,
  showPropertySelector,
}: {
  availableUnits: Unit[];
  canManageTenantNotices: boolean;
  form: AnnouncementForm;
  onFormChange: (form: AnnouncementForm) => void;
  properties: Property[];
  showPropertySelector: boolean;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="announcement-audience">Audience</Label>
        <select
          id="announcement-audience"
          className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
          value={form.audience}
          onChange={(event) =>
            onFormChange({
              ...form,
              audience: event.target.value as AnnouncementForm["audience"],
              propertyId: "",
              unitId: "",
            })
          }
        >
          {canManageTenantNotices ? (
            <>
              <option value="all">All residents</option>
              <option value="property">One rental property</option>
              <option value="unit">One rental unit</option>
            </>
          ) : null}
          <option value="agents">All approved agents</option>
        </select>
      </div>
      {showPropertySelector ? (
        <div className="grid gap-2">
          <Label htmlFor="announcement-property">Rental property</Label>
          <select
            id="announcement-property"
            required
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
            value={form.propertyId}
            onChange={(event) =>
              onFormChange({
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
              onFormChange({ ...form, unitId: event.target.value })
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
      <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={form.requiresAcknowledgement}
          onChange={(event) =>
            onFormChange({
              ...form,
              requiresAcknowledgement: event.target.checked,
            })
          }
        />
        <span>
          <span className="block font-medium">Require acknowledgement</span>
          <span className="mt-1 block text-muted-foreground">
            Recipients must confirm they reviewed this announcement.
          </span>
        </span>
      </label>
    </>
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
