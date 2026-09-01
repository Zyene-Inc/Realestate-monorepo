"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { InspectionPhotoPanel } from "@/components/inspections/inspection-photo-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  inspectionProgress,
  localDateTimeValue,
  type InspectionSummary,
  type MoveInInspection,
} from "@/lib/move-in-inspections";
import { InspectionChecklistEditor } from "./_components/inspection-checklist-editor";
import { InspectionHandoverEditor } from "./_components/inspection-handover-editor";
import {
  InspectionReadinessItem,
  InspectionStatusBadge,
} from "./_components/inspection-status-ui";
import { InspectionWorkflowActions } from "./_components/inspection-workflow-actions";

type LeaseOption = {
  id: string;
  status: string;
  startDate: string;
  tenant: { firstName: string; lastName: string };
  unit: { unitNumber: string; property: { name: string } };
};

async function fetchInspectionPageData() {
  const [inspectionResponse, leases] = await Promise.all([
    api.get("/admin/move-in-inspections?take=100") as Promise<{
      items: InspectionSummary[];
    }>,
    api.get("/admin/leases") as Promise<LeaseOption[]>,
  ]);
  return { summaries: inspectionResponse.items, leases };
}

export default function MoveInInspectionsPage() {
  const [summaries, setSummaries] = useState<InspectionSummary[]>([]);
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [selected, setSelected] = useState<MoveInInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaseId, setLeaseId] = useState("");
  const [creating, setCreating] = useState(false);
  const inspectionLeaseIds = useMemo(
    () => new Set(summaries.map((inspection) => inspection.leaseId)),
    [summaries],
  );
  const eligibleLeases = leases.filter(
    (lease) =>
      ["active", "expiring", "renewed"].includes(lease.status) &&
      !inspectionLeaseIds.has(lease.id),
  );

  async function load() {
    try {
      const data = await fetchInspectionPageData();
      setSummaries(data.summaries);
      setLeases(data.leases);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load move-in inspections"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchInspectionPageData()
      .then((data) => {
        if (!active) return;
        setSummaries(data.summaries);
        setLeases(data.leases);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(
            getErrorMessage(error, "Unable to load move-in inspections"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function open(id: string) {
    try {
      const inspection = (await api.get(
        `/admin/move-in-inspections/${id}`,
      )) as MoveInInspection;
      setSelected(inspection);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to open inspection"));
    }
  }

  async function create() {
    if (!leaseId) return;
    setCreating(true);
    try {
      const inspection = (await api.post("/admin/move-in-inspections", {
        leaseId,
      })) as MoveInInspection;
      setSelected(inspection);
      setLeaseId("");
      await load();
      toast.success("Move-in inspection prepared");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to prepare inspection"));
    } finally {
      setCreating(false);
    }
  }

  function updateSelected(inspection: MoveInInspection) {
    setSelected(inspection);
    void load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full max-w-2xl" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (selected) {
    return (
      <InspectionWorkspace
        inspection={selected}
        onBack={() => setSelected(null)}
        onUpdated={updateSelected}
      />
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Resident handover
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Move-in inspections
        </h1>
        <p className="mt-3 max-w-[70ch] text-muted-foreground">
          Document opening condition, utility baselines, photos, and every key
          before the resident acknowledges the record.
        </p>
      </header>

      <section
        className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6"
        aria-labelledby="prepare-inspection-title"
      >
        <div className="flex items-start gap-3">
          <Plus className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 id="prepare-inspection-title" className="text-lg font-semibold">
              Prepare an inspection
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New active leases receive a draft automatically. Use this for an
              existing lease that does not have one.
            </p>
          </div>
        </div>
        <form
          className="mt-5 flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="inspection-lease">Current lease</Label>
            <select
              id="inspection-lease"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={leaseId}
              onChange={(event) => setLeaseId(event.target.value)}
            >
              <option value="">Choose resident and home…</option>
              {eligibleLeases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenant.firstName} {lease.tenant.lastName} ·{" "}
                  {lease.unit.property.name} · Unit {lease.unit.unitNumber}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={!leaseId || creating}>
            {creating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ClipboardCheck />
            )}
            Prepare inspection
          </Button>
        </form>
      </section>

      <section aria-labelledby="inspection-records-title">
        <div className="flex items-center justify-between gap-4">
          <h2 id="inspection-records-title" className="text-xl font-semibold">
            Inspection records
          </h2>
          <span className="text-sm text-muted-foreground">
            {summaries.length} total
          </span>
        </div>
        {summaries.length ? (
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
            {summaries.map((inspection) => (
              <button
                key={inspection.id}
                type="button"
                className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                onClick={() => void open(inspection.id)}
              >
                <div>
                  <p className="font-semibold">
                    {inspection.tenant.firstName} {inspection.tenant.lastName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {inspection.unit.property.name} · Unit{" "}
                    {inspection.unit.unitNumber} ·{" "}
                    {inspection.unit.property.address}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {inspection._count.photos} photos · {inspection._count.keys}{" "}
                    key records
                  </span>
                  <InspectionStatusBadge status={inspection.status} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.25rem] border border-dashed border-border px-6 py-14 text-center">
            <ClipboardCheck className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-semibold">No inspections yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a current lease above to prepare its opening-condition
              record.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function InspectionWorkspace({
  inspection,
  onBack,
  onUpdated,
}: {
  inspection: MoveInInspection;
  onBack: () => void;
  onUpdated: (inspection: MoveInInspection) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const editable = inspection.status === "DRAFT";
  const progress = inspectionProgress(inspection);

  async function saveOverview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduledAt = String(form.get("scheduledAt") || "");
    setBusy("save");
    try {
      const updated = (await api.patch(
        `/admin/move-in-inspections/${inspection.id}`,
        {
          expectedRevision: inspection.revision,
          scheduledAt: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
          staffNotes: String(form.get("staffNotes") || ""),
          noPhysicalKeys: form.has("noPhysicalKeys"),
          accessMethodNotes: String(form.get("accessMethodNotes") || ""),
        },
      )) as MoveInInspection;
      onUpdated(updated);
      toast.success("Inspection details saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save inspection details"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft />
        All inspections
      </Button>
      <header className="flex flex-col gap-6 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <InspectionStatusBadge status={inspection.status} />
            <span className="text-sm text-muted-foreground">
              Revision {inspection.revision}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {inspection.unit.property.name}, unit {inspection.unit.unitNumber}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {inspection.tenant.firstName} {inspection.tenant.lastName} ·{" "}
            {inspection.unit.property.address}, {inspection.unit.property.city},{" "}
            {inspection.unit.property.state}
          </p>
        </div>
        <div className="min-w-56">
          <div className="flex justify-between text-xs font-semibold">
            <span>Checklist progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <section
        className="grid gap-5 md:grid-cols-3"
        aria-label="Inspection readiness"
      >
        <InspectionReadinessItem
          icon={ClipboardCheck}
          label="Condition items"
          value={`${inspection.readiness.itemCount - inspection.readiness.uninspected} of ${inspection.readiness.itemCount}`}
          complete={
            inspection.readiness.uninspected === 0 &&
            inspection.readiness.itemCount > 0
          }
        />
        <InspectionReadinessItem
          icon={KeyRound}
          label="Key handover"
          value={
            inspection.readiness.keysComplete ? "Documented" : "Needs attention"
          }
          complete={inspection.readiness.keysComplete}
        />
        <InspectionReadinessItem
          icon={ShieldCheck}
          label="Resident review"
          value={
            inspection.status === "COMPLETED"
              ? "Acknowledged"
              : inspection.status === "READY_FOR_TENANT"
                ? "Waiting"
                : "Not sent"
          }
          complete={inspection.status === "COMPLETED"}
        />
      </section>

      <form
        key={`${inspection.id}:${inspection.revision}`}
        className="space-y-5 rounded-[1.25rem] border border-border bg-card p-5 sm:p-6"
        aria-labelledby="inspection-details-title"
        onSubmit={(event) => void saveOverview(event)}
      >
        <div>
          <h2 id="inspection-details-title" className="text-lg font-semibold">
            Visit details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule the walkthrough and record staff-only context.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inspection-scheduled-at">
              Inspection date and time
            </Label>
            <Input
              id="inspection-scheduled-at"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={localDateTimeValue(inspection.scheduledAt)}
              disabled={!editable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspection-staff-notes">Internal notes</Label>
            <Textarea
              id="inspection-staff-notes"
              name="staffNotes"
              rows={3}
              defaultValue={inspection.staffNotes || ""}
              disabled={!editable}
              maxLength={5000}
              placeholder="Access arrangements or staff follow-up"
            />
          </div>
        </div>
        <div className="rounded-2xl bg-secondary/35 p-4">
          <label className="flex min-h-11 items-center gap-3 font-medium">
            <input
              type="checkbox"
              name="noPhysicalKeys"
              className="size-4 accent-primary"
              defaultChecked={inspection.noPhysicalKeys}
              disabled={!editable}
            />
            This home uses no physical keys
          </label>
          <div className="mt-3 space-y-2">
            <Label htmlFor="access-method-notes">Keyless access method</Label>
            <Textarea
              id="access-method-notes"
              name="accessMethodNotes"
              defaultValue={inspection.accessMethodNotes || ""}
              disabled={!editable}
              maxLength={2000}
              placeholder="Required for keyless homes. Describe delivery without storing a reusable access code."
            />
          </div>
        </div>
        {editable ? (
          <Button type="submit" variant="outline" disabled={busy === "save"}>
            {busy === "save" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            Save visit details
          </Button>
        ) : null}
      </form>

      <InspectionChecklistEditor
        inspection={inspection}
        editable={editable}
        onUpdated={onUpdated}
      />
      <InspectionHandoverEditor
        inspection={inspection}
        editable={editable}
        onUpdated={onUpdated}
      />
      <InspectionPhotoPanel
        inspection={inspection}
        endpointBase={`/admin/move-in-inspections/${inspection.id}`}
        editable={editable}
        removableSource="STAFF"
        onUpdated={onUpdated}
      />

      <InspectionWorkflowActions
        inspection={inspection}
        onUpdated={onUpdated}
      />
    </div>
  );
}
