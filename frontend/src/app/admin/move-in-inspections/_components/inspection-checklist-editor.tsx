"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  CONDITION_LABELS,
  INSPECTION_CONDITIONS,
  type InspectionArea,
  type InspectionItem,
  type MoveInInspection,
} from "@/lib/move-in-inspections";

type Props = {
  inspection: MoveInInspection;
  editable: boolean;
  onUpdated: (inspection: MoveInInspection) => void;
};

export function InspectionChecklistEditor({
  inspection,
  editable,
  onUpdated,
}: Props) {
  const [newArea, setNewArea] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [addingItem, setAddingItem] = useState<string | null>(null);

  async function addArea() {
    if (!newArea.trim()) return;
    setAddingArea(true);
    try {
      const updated = (await api.post(
        `/admin/move-in-inspections/${inspection.id}/areas`,
        {
          expectedRevision: inspection.revision,
          name: newArea.trim(),
          sortOrder: inspection.areas.length,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      setNewArea("");
      toast.success("Room added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add room"));
    } finally {
      setAddingArea(false);
    }
  }

  async function addItem(area: InspectionArea) {
    const name = newItems[area.id]?.trim();
    if (!name) return;
    setAddingItem(area.id);
    try {
      const updated = (await api.post(
        `/admin/move-in-inspections/${inspection.id}/items`,
        {
          expectedRevision: inspection.revision,
          areaId: area.id,
          name,
          sortOrder: area.items.length,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      setNewItems((current) => ({ ...current, [area.id]: "" }));
      toast.success("Checklist item added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add checklist item"));
    } finally {
      setAddingItem(null);
    }
  }

  async function removeArea(area: InspectionArea) {
    if (area.items.length) {
      toast.error("Remove this room’s checklist items first");
      return;
    }
    try {
      const updated = (await api.delete(
        `/admin/move-in-inspections/${inspection.id}/areas/${area.id}`,
        { expectedRevision: inspection.revision },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success("Room removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove room"));
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="inspection-checklist-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="inspection-checklist-title" className="text-lg font-semibold">
            Condition checklist
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect every supplied surface, fixture, and system. Use notes for
            existing marks.
          </p>
        </div>
        <div className="text-sm font-semibold tabular-nums">
          {inspection.readiness.itemCount - inspection.readiness.uninspected} of{" "}
          {inspection.readiness.itemCount} complete
        </div>
      </div>

      <div className="space-y-5">
        {inspection.areas.map((area) => (
          <section
            key={area.id}
            className="overflow-hidden rounded-2xl border border-border"
          >
            <div className="flex items-center justify-between gap-4 bg-secondary/45 px-5 py-4">
              <h4 className="font-semibold">{area.name}</h4>
              {editable && area.items.length === 0 ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${area.name}`}
                  onClick={() => void removeArea(area)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
            <div className="divide-y divide-border">
              {area.items.map((item) => (
                <ChecklistItemRow
                  key={`${item.id}:${item.condition}:${item.staffNotes || ""}`}
                  inspection={inspection}
                  item={item}
                  editable={editable}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
            {editable ? (
              <form
                className="flex flex-col gap-3 border-t border-border bg-secondary/20 p-4 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addItem(area);
                }}
              >
                <Input
                  aria-label={`New checklist item for ${area.name}`}
                  value={newItems[area.id] || ""}
                  onChange={(event) =>
                    setNewItems((current) => ({
                      ...current,
                      [area.id]: event.target.value,
                    }))
                  }
                  placeholder="Add fixture or surface"
                  maxLength={120}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={
                    addingItem === area.id || !newItems[area.id]?.trim()
                  }
                >
                  {addingItem === area.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Plus />
                  )}
                  Add item
                </Button>
              </form>
            ) : null}
          </section>
        ))}
      </div>

      {editable ? (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void addArea();
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="new-inspection-area">Additional room or area</Label>
            <Input
              id="new-inspection-area"
              value={newArea}
              onChange={(event) => setNewArea(event.target.value)}
              placeholder="Laundry room, basement, garage…"
              maxLength={100}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={addingArea || !newArea.trim()}
          >
            {addingArea ? <Loader2 className="animate-spin" /> : <Plus />}
            Add room
          </Button>
        </form>
      ) : null}
    </section>
  );
}

function ChecklistItemRow({
  inspection,
  item,
  editable,
  onUpdated,
}: {
  inspection: MoveInInspection;
  item: InspectionItem;
  editable: boolean;
  onUpdated: (inspection: MoveInInspection) => void;
}) {
  const conditionRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = (await api.patch(
        `/admin/move-in-inspections/${inspection.id}/items/${item.id}`,
        {
          expectedRevision: inspection.revision,
          condition: conditionRef.current?.value,
          staffNotes: notesRef.current?.value,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success(`${item.name} saved`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save checklist item"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      const updated = (await api.delete(
        `/admin/move-in-inspections/${inspection.id}/items/${item.id}`,
        { expectedRevision: inspection.revision },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success("Checklist item removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove checklist item"));
    } finally {
      setSaving(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(180px,1fr)_180px_minmax(220px,1.4fr)_auto] lg:items-start">
      <div>
        <p className="font-medium">{item.name}</p>
        {item.tenantCondition || item.tenantNotes ? (
          <div className="mt-2 rounded-xl bg-secondary/60 p-3 text-xs">
            <p className="font-semibold">Resident observation</p>
            <p className="mt-1 text-muted-foreground">
              {item.tenantCondition
                ? CONDITION_LABELS[item.tenantCondition]
                : "Note added"}
              {item.tenantNotes ? `: ${item.tenantNotes}` : ""}
            </p>
          </div>
        ) : null}
      </div>
      <select
        aria-label={`Condition for ${item.name}`}
        className="h-11 rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-70"
        ref={conditionRef}
        defaultValue={item.condition}
        disabled={!editable}
      >
        {INSPECTION_CONDITIONS.map((value) => (
          <option key={value} value={value}>
            {CONDITION_LABELS[value]}
          </option>
        ))}
      </select>
      <Textarea
        aria-label={`Staff notes for ${item.name}`}
        ref={notesRef}
        defaultValue={item.staffNotes || ""}
        disabled={!editable}
        maxLength={2000}
        rows={2}
        placeholder="Existing marks, wear, test result…"
      />
      {editable ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Save ${item.name}`}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
          <Button
            type="button"
            size={confirmingDelete ? "sm" : "icon-sm"}
            variant={confirmingDelete ? "destructive" : "ghost"}
            aria-label={`Remove ${item.name}`}
            disabled={saving}
            onBlur={() => setConfirmingDelete(false)}
            onClick={() => void remove()}
          >
            <Trash2 />
            {confirmingDelete ? "Confirm" : null}
          </Button>
        </div>
      ) : (
        <div className="flex size-9 items-center justify-center text-primary">
          <Check />
        </div>
      )}
    </div>
  );
}
