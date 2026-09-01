"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { InspectionPhotoPanel } from "@/components/inspections/inspection-photo-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  CONDITION_LABELS,
  formatInspectionDateTime,
  formatInspectionNumber,
  INSPECTION_CONDITIONS,
  INSPECTION_STATUS_LABELS,
  type InspectionItem,
  type MoveInInspection,
} from "@/lib/move-in-inspections";

const RESIDENT_INSPECTION_CONDITIONS = INSPECTION_CONDITIONS.filter(
  (value) => value !== "NOT_INSPECTED",
);

export default function TenantMoveInPage() {
  const [inspection, setInspection] = useState<MoveInInspection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/tenant/portal/move-in-inspection")
      .then((data) => setInspection(data as MoveInInspection | null))
      .catch((error) =>
        toast.error(
          getErrorMessage(error, "Unable to load move-in inspection"),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <ClipboardCheck className="size-6 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">
          No inspection is ready yet
        </h1>
        <p className="mx-auto mt-2 max-w-[58ch] text-sm text-muted-foreground">
          Management will place the opening-condition record here after the
          walkthrough and key handover are documented.
        </p>
      </div>
    );
  }

  const editable = inspection.status === "READY_FOR_TENANT";
  return (
    <div className="space-y-8 pb-12">
      <header className="border-b border-border pb-7">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={
              inspection.status === "COMPLETED" ? "default" : "secondary"
            }
          >
            {INSPECTION_STATUS_LABELS[inspection.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Record revision {inspection.revision}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Move-in condition record
        </h1>
        <p className="mt-3 max-w-[70ch] text-muted-foreground">
          {inspection.unit.property.name}, unit {inspection.unit.unitNumber} ·{" "}
          {inspection.unit.property.address}, {inspection.unit.property.city},{" "}
          {inspection.unit.property.state}
        </p>
        {inspection.scheduledAt ? (
          <p className="mt-2 text-sm font-medium">
            Walkthrough: {formatInspectionDateTime(inspection.scheduledAt)}
          </p>
        ) : null}
      </header>

      {editable ? (
        <section className="rounded-[1.25rem] border border-primary/25 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="font-semibold">Review before acknowledging</h2>
              <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
                Compare the record with the home. Add your own condition or note
                to any item, and upload photos where they clarify an
                observation.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-5" aria-labelledby="resident-condition-title">
        <div>
          <h2 id="resident-condition-title" className="text-xl font-semibold">
            Room-by-room condition
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff observations stay visible beside anything you add.
          </p>
        </div>
        {inspection.areas.map((area) => (
          <section
            key={area.id}
            className="overflow-hidden rounded-[1.25rem] border border-border bg-card"
          >
            <h3 className="bg-secondary/45 px-5 py-4 font-semibold">
              {area.name}
            </h3>
            <div className="divide-y divide-border">
              {area.items.map((item) => (
                <TenantObservationRow
                  key={`${item.id}:${item.tenantCondition || ""}:${item.tenantNotes || ""}`}
                  inspection={inspection}
                  item={item}
                  editable={editable}
                  onUpdated={setInspection}
                />
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.25rem] border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Gauge className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="font-semibold">Utility baselines</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Readings recorded at move-in.
              </p>
            </div>
          </div>
          {inspection.meterReadings.length ? (
            <div className="mt-5 divide-y divide-border">
              {inspection.meterReadings.map((meter) => (
                <div key={meter.id} className="flex justify-between gap-4 py-3">
                  <span className="font-medium">{meter.label}</span>
                  <span className="text-sm tabular-nums">
                    {formatInspectionNumber(Number(meter.reading))} {meter.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              No property-managed meters were recorded.
            </p>
          )}
        </div>
        <div className="rounded-[1.25rem] border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="font-semibold">Keys and access received</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirm this matches what was handed to you.
              </p>
            </div>
          </div>
          {inspection.noPhysicalKeys ? (
            <p className="mt-5 text-sm">
              Keyless access: {inspection.accessMethodNotes}
            </p>
          ) : (
            <div className="mt-5 divide-y divide-border">
              {inspection.keys.map((key) => (
                <div key={key.id} className="flex justify-between gap-4 py-3">
                  <span className="font-medium">{key.label}</span>
                  <span className="text-sm">Quantity {key.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <InspectionPhotoPanel
        inspection={inspection}
        endpointBase={`/tenant/portal/move-in-inspection/${inspection.id}`}
        editable={editable}
        removableSource="TENANT"
        onUpdated={setInspection}
      />

      {editable ? (
        <AcknowledgementForm
          inspection={inspection}
          onUpdated={setInspection}
        />
      ) : inspection.acknowledgement ? (
        <section className="rounded-[1.25rem] border border-primary/25 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="font-semibold">Acknowledgement complete</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Signed by {inspection.acknowledgement.typedName} on{" "}
                {formatInspectionDateTime(
                  inspection.acknowledgement.acknowledgedAt,
                )}
                .
              </p>
              <p className="mt-3 text-sm">
                {inspection.acknowledgement.statementText}
              </p>
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                Record SHA-256: {inspection.acknowledgement.recordSha256}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TenantObservationRow({
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

  async function save() {
    setSaving(true);
    try {
      const updated = (await api.patch(
        `/tenant/portal/move-in-inspection/${inspection.id}/items/${item.id}`,
        {
          expectedRevision: inspection.revision,
          condition: conditionRef.current?.value || undefined,
          notes: notesRef.current?.value,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success(`${item.name} observation saved`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save observation"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)]">
      <div>
        <p className="font-semibold">{item.name}</p>
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">Staff condition:</span>{" "}
          {CONDITION_LABELS[item.condition]}
        </p>
        {item.staffNotes ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {item.staffNotes}
          </p>
        ) : null}
      </div>
      {editable ? (
        <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
          <select
            aria-label={`Your condition for ${item.name}`}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            ref={conditionRef}
            defaultValue={item.tenantCondition || ""}
          >
            <option value="">Matches staff record</option>
            {RESIDENT_INSPECTION_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {CONDITION_LABELS[value]}
              </option>
            ))}
          </select>
          <Textarea
            aria-label={`Your note for ${item.name}`}
            rows={2}
            ref={notesRef}
            defaultValue={item.tenantNotes || ""}
            maxLength={2000}
            placeholder="Add a difference, mark, or concern"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Save your observation for ${item.name}`}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
        </div>
      ) : item.tenantCondition || item.tenantNotes ? (
        <div className="rounded-xl bg-secondary/45 p-4 text-sm">
          <p className="font-semibold">Your observation</p>
          <p className="mt-1 text-muted-foreground">
            {item.tenantCondition
              ? CONDITION_LABELS[item.tenantCondition]
              : "Note added"}
            {item.tenantNotes ? `: ${item.tenantNotes}` : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No resident difference recorded.
        </p>
      )}
    </div>
  );
}

function AcknowledgementForm({
  inspection,
  onUpdated,
}: {
  inspection: MoveInInspection;
  onUpdated: (inspection: MoveInInspection) => void;
}) {
  const expectedName = `${inspection.tenant.firstName} ${inspection.tenant.lastName}`;
  const [typedName, setTypedName] = useState("");
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function acknowledge() {
    setSubmitting(true);
    try {
      const updated = (await api.post(
        `/tenant/portal/move-in-inspection/${inspection.id}/acknowledge`,
        {
          expectedRevision: inspection.revision,
          accepted,
          typedName,
          tenantNotes: notes,
        },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success("Move-in inspection acknowledged");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to acknowledge inspection"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="space-y-5 rounded-[1.25rem] border border-border bg-card p-5 sm:p-6"
      aria-labelledby="acknowledgement-title"
    >
      <div>
        <h2 id="acknowledgement-title" className="text-xl font-semibold">
          Acknowledge the move-in record
        </h2>
        <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
          {inspection.acknowledgementStatement}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="acknowledgement-notes">
          Final resident note (optional)
        </Label>
        <Textarea
          id="acknowledgement-notes"
          value={notes}
          maxLength={3000}
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything else that should remain with this record"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acknowledgement-name">
          Type your full name: {expectedName}
        </Label>
        <Input
          id="acknowledgement-name"
          value={typedName}
          maxLength={160}
          autoComplete="name"
          onChange={(event) => setTypedName(event.target.value)}
        />
      </div>
      <label className="flex min-h-11 items-start gap-3 rounded-xl bg-secondary/40 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        <span>
          I reviewed the record and confirm the acknowledgement statement above.
        </span>
      </label>
      <Button
        type="button"
        disabled={
          !accepted ||
          typedName.trim().toLowerCase() !== expectedName.toLowerCase() ||
          submitting
        }
        onClick={() => void acknowledge()}
      >
        {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
        Complete acknowledgement
      </Button>
    </section>
  );
}
