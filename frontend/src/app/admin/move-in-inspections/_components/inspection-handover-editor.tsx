"use client";

import { useState } from "react";
import { Gauge, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  InspectionKey,
  InspectionKeyType,
  InspectionMeterType,
  MoveInInspection,
} from "@/lib/move-in-inspections";
import {
  formatInspectionDateTime,
  formatInspectionNumber,
} from "@/lib/move-in-inspections";

type Props = {
  inspection: MoveInInspection;
  editable: boolean;
  onUpdated: (inspection: MoveInInspection) => void;
};

const nowLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

export function InspectionHandoverEditor({
  inspection,
  editable,
  onUpdated,
}: Props) {
  return (
    <section className="grid gap-8 xl:grid-cols-2" aria-label="Meters and keys">
      <MeterSection
        inspection={inspection}
        editable={editable}
        onUpdated={onUpdated}
      />
      <KeySection
        inspection={inspection}
        editable={editable}
        onUpdated={onUpdated}
      />
    </section>
  );
}

function MeterSection({ inspection, editable, onUpdated }: Props) {
  const [type, setType] = useState<InspectionMeterType>("ELECTRIC");
  const [label, setLabel] = useState("");
  const [reading, setReading] = useState("");
  const [unit, setUnit] = useState("");
  const [readAt, setReadAt] = useState(nowLocal);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const updated = (await api.post(
        `/admin/move-in-inspections/${inspection.id}/meters`,
        {
          expectedRevision: inspection.revision,
          type,
          label,
          reading: Number(reading),
          unit,
          readAt: new Date(readAt).toISOString(),
          sortOrder: inspection.meterReadings.length,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      setLabel("");
      setReading("");
      setUnit("");
      toast.success("Meter reading added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add meter reading"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      const updated = (await api.delete(
        `/admin/move-in-inspections/${inspection.id}/meters/${id}`,
        { expectedRevision: inspection.revision },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success("Meter reading removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove meter reading"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Gauge className="mt-0.5 size-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Meter readings</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the utility baseline at handover time.
          </p>
        </div>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {inspection.meterReadings.length ? (
          inspection.meterReadings.map((meter) => (
            <div
              key={meter.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-semibold">{meter.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatInspectionNumber(Number(meter.reading))} {meter.unit} ·{" "}
                  {formatInspectionDateTime(meter.readAt)}
                </p>
              </div>
              {editable ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${meter.label}`}
                  onClick={() => void remove(meter.id)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted-foreground">
            No meter readings recorded.
          </p>
        )}
      </div>
      {editable ? (
        <form
          className="grid gap-4 rounded-2xl bg-secondary/30 p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <Field label="Utility">
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(event) =>
                setType(event.target.value as InspectionMeterType)
              }
            >
              <option value="ELECTRIC">Electric</option>
              <option value="GAS">Gas</option>
              <option value="WATER">Water</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Meter label">
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
              maxLength={100}
              placeholder="Main electric meter"
            />
          </Field>
          <Field label="Reading">
            <Input
              type="number"
              min="0"
              step="0.001"
              value={reading}
              onChange={(event) => setReading(event.target.value)}
              required
            />
          </Field>
          <Field label="Unit">
            <Input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              required
              maxLength={30}
              placeholder="kWh, therms, gallons"
            />
          </Field>
          <Field label="Read at" className="sm:col-span-2">
            <Input
              type="datetime-local"
              value={readAt}
              onChange={(event) => setReadAt(event.target.value)}
              required
            />
          </Field>
          <Button
            type="submit"
            variant="outline"
            disabled={busy}
            className="sm:col-span-2 sm:justify-self-start"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            Add reading
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function KeySection({ inspection, editable, onUpdated }: Props) {
  const [type, setType] = useState<InspectionKeyType>("UNIT");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const updated = (await api.post(
        `/admin/move-in-inspections/${inspection.id}/keys`,
        {
          expectedRevision: inspection.revision,
          type,
          label,
          quantity: Number(quantity),
          sortOrder: inspection.keys.length,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      setLabel("");
      setQuantity("1");
      toast.success("Key record added");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add key record"));
    } finally {
      setBusy(false);
    }
  }

  async function update(key: InspectionKey, handedOver: boolean) {
    try {
      const updated = (await api.patch(
        `/admin/move-in-inspections/${inspection.id}/keys/${key.id}`,
        {
          expectedRevision: inspection.revision,
          handedOverAt: handedOver ? new Date().toISOString() : undefined,
          clearHandover: !handedOver,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success(handedOver ? "Handover recorded" : "Handover reset");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update key handover"));
    }
  }

  async function remove(id: string) {
    try {
      const updated = (await api.delete(
        `/admin/move-in-inspections/${inspection.id}/keys/${id}`,
        { expectedRevision: inspection.revision },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success("Key record removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to remove key record"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Keys and access</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Record quantities, then mark each handover after the resident
            receives it.
          </p>
        </div>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {inspection.keys.length ? (
          inspection.keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {key.label} · {key.quantity}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {key.handedOverAt
                    ? `Handed over ${formatInspectionDateTime(key.handedOverAt)}`
                    : "Not handed over"}
                </p>
              </div>
              {editable ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void update(key, !key.handedOverAt)}
                  >
                    {key.handedOverAt ? "Reset" : "Mark handed over"}
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${key.label}`}
                    onClick={() => void remove(key.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted-foreground">
            No physical keys recorded.
          </p>
        )}
      </div>
      {editable && !inspection.noPhysicalKeys ? (
        <form
          className="grid gap-4 rounded-2xl bg-secondary/30 p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <Field label="Access type">
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(event) =>
                setType(event.target.value as InspectionKeyType)
              }
            >
              <option value="UNIT">Unit key</option>
              <option value="MAILBOX">Mailbox key</option>
              <option value="GARAGE">Garage remote</option>
              <option value="FOB">Key fob</option>
              <option value="ACCESS_CARD">Access card</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Label">
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
              maxLength={100}
              placeholder="Building entry fob"
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </Field>
          <Button
            type="submit"
            variant="outline"
            disabled={busy}
            className="self-end sm:justify-self-start"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            Add key
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
