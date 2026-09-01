"use client";

import { useEffect, useReducer, useState } from "react";
import { CalendarClock, ClipboardCheck, Loader2, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  listWebsiteLeadAssignees,
  screeningStatusLabel,
  tourStatusLabel,
  updateWebsiteLeadWorkflow,
  websiteLeadStatusLabel,
  type WebsiteLeadAssignee,
  type WebsiteLeadDetail,
  type WebsiteLeadScreeningStatus,
  type WebsiteLeadStatus,
  type WebsiteLeadTourStatus,
} from "@/lib/website-leads";

type LeadWorkflowPanelProps = {
  lead: WebsiteLeadDetail;
  onUpdated: (lead: WebsiteLeadDetail) => void;
};

type WorkflowForm = {
  assignedToUserId: string;
  status: WebsiteLeadStatus;
  screeningStatus: WebsiteLeadScreeningStatus;
  screeningSummary: string;
  tourStatus: WebsiteLeadTourStatus;
  tourScheduledAt: string;
};

const RENTAL_INTENTS = new Set([
  "RENTAL_INQUIRY",
  "RENTAL_TOUR",
  "RENTAL_APPLICATION",
  "SIMILAR_RENTAL",
]);
const LEAD_STATUSES: WebsiteLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "SCREENING",
  "TOUR_SCHEDULED",
  "CLOSED",
];
const SCREENING_STATUSES: WebsiteLeadScreeningStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "QUALIFIED",
  "NOT_QUALIFIED",
];
const TOUR_STATUSES: WebsiteLeadTourStatus[] = [
  "NOT_SCHEDULED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
];
const selectClassName =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60";

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createWorkflowForm(lead: WebsiteLeadDetail): WorkflowForm {
  return {
    assignedToUserId: lead.assignedToUserId ?? "",
    status: lead.status,
    screeningStatus: lead.screeningStatus,
    screeningSummary: lead.screeningSummary ?? "",
    tourStatus: lead.tourStatus,
    tourScheduledAt: toLocalDateTime(lead.tourScheduledAt),
  };
}

function updateWorkflowForm(
  current: WorkflowForm,
  update: Partial<WorkflowForm>,
) {
  return { ...current, ...update };
}

export function LeadWorkflowPanel({ lead, onUpdated }: LeadWorkflowPanelProps) {
  const rentalLead = Boolean(lead.intent && RENTAL_INTENTS.has(lead.intent));
  const [assignees, setAssignees] = useState<WebsiteLeadAssignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(true);
  const [form, setForm] = useReducer(
    updateWorkflowForm,
    lead,
    createWorkflowForm,
  );
  const [saving, setSaving] = useState(false);
  const workflowChanged =
    form.assignedToUserId !== (lead.assignedToUserId ?? "") ||
    form.status !== lead.status ||
    (rentalLead &&
      (form.screeningStatus !== lead.screeningStatus ||
        form.screeningSummary.trim() !== (lead.screeningSummary ?? "") ||
        form.tourStatus !== lead.tourStatus ||
        form.tourScheduledAt !== toLocalDateTime(lead.tourScheduledAt)));

  useEffect(() => {
    let active = true;
    listWebsiteLeadAssignees(lead.id)
      .then((items) => {
        if (active) setAssignees(items);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(getErrorMessage(error, "Unable to load staff assignments"));
        }
      })
      .finally(() => {
        if (active) setAssigneesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lead.id]);

  const changeScreeningStatus = (next: WebsiteLeadScreeningStatus) => {
    if (next === "IN_PROGRESS" && form.status !== "TOUR_SCHEDULED") {
      setForm({ screeningStatus: next, status: "SCREENING" });
    } else if (
      (next === "QUALIFIED" || next === "NOT_QUALIFIED") &&
      form.status === "SCREENING"
    ) {
      setForm({ screeningStatus: next, status: "CONTACTED" });
    } else {
      setForm({ screeningStatus: next });
    }
  };

  const changeTourStatus = (next: WebsiteLeadTourStatus) => {
    if (next === "SCHEDULED") {
      setForm({ tourStatus: next, status: "TOUR_SCHEDULED" });
    } else if (form.status === "TOUR_SCHEDULED") {
      setForm({ tourStatus: next, status: "CONTACTED" });
    } else {
      setForm({ tourStatus: next });
    }
    if (next === "NOT_SCHEDULED") setForm({ tourScheduledAt: "" });
  };

  const save = async () => {
    if (form.status === "CLOSED" && form.tourStatus === "SCHEDULED") {
      toast.error("Cancel or complete the scheduled tour before closing this lead");
      return;
    }
    if (
      form.status === "SCREENING" &&
      form.screeningStatus !== "IN_PROGRESS"
    ) {
      toast.error("Set screening to In progress before using the Screening stage");
      return;
    }
    if (form.tourStatus === "SCHEDULED" && !form.tourScheduledAt) {
      toast.error("Choose a future tour date and time");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateWebsiteLeadWorkflow(lead.id, {
        status: form.status,
        assignedToUserId: form.assignedToUserId || null,
        ...(rentalLead
          ? {
              screeningStatus: form.screeningStatus,
              screeningSummary: form.screeningSummary.trim() || null,
              tourStatus: form.tourStatus,
              tourScheduledAt: form.tourScheduledAt
                ? new Date(form.tourScheduledAt).toISOString()
                : null,
            }
          : {}),
        expectedUpdatedAt: lead.updatedAt,
      });
      onUpdated(updated);
      toast.success("Lead workflow saved");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to save lead workflow"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="lead-workflow-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="lead-workflow-title" className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="size-4 text-primary" aria-hidden="true" />
            Manager workflow
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign ownership, record screening, and coordinate the next action.
          </p>
        </div>
        <Button
          onClick={() => void save()}
          disabled={saving || assigneesLoading || !workflowChanged}
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Save workflow
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`lead-stage-${lead.id}`}>Lead stage</Label>
          <select
            id={`lead-stage-${lead.id}`}
            className={selectClassName}
            value={form.status}
            onChange={(event) =>
              setForm({ status: event.target.value as WebsiteLeadStatus })
            }
          >
            {LEAD_STATUSES.map((item) => (
              <option
                key={item}
                value={item}
                disabled={item === "SCREENING" || item === "TOUR_SCHEDULED"}
                hidden={
                  !rentalLead &&
                  (item === "SCREENING" || item === "TOUR_SCHEDULED")
                }
              >
                {websiteLeadStatusLabel(item)}
                {item === "SCREENING" || item === "TOUR_SCHEDULED"
                  ? " · managed below"
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lead-assignee-${lead.id}`}>
            <UserRoundCheck className="size-4" aria-hidden="true" />
            Assigned manager
          </Label>
          <select
            id={`lead-assignee-${lead.id}`}
            className={selectClassName}
            value={form.assignedToUserId}
            onChange={(event) =>
              setForm({ assignedToUserId: event.target.value })
            }
            disabled={assigneesLoading}
          >
            <option value="">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.email} · {assignee.role.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rentalLead ? (
        <div className="mt-6 grid gap-5 border-t pt-5 xl:grid-cols-2">
          <div className="space-y-4 rounded-xl bg-secondary/40 p-4">
            <div>
              <h4 className="font-semibold">Pre-screening</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Track the outcome without storing identity documents or sensitive financial data here.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`screening-status-${lead.id}`}>Screening status</Label>
              <select
                id={`screening-status-${lead.id}`}
                className={selectClassName}
                value={form.screeningStatus}
                onChange={(event) =>
                  changeScreeningStatus(
                    event.target.value as WebsiteLeadScreeningStatus,
                  )
                }
              >
                {SCREENING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {screeningStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`screening-summary-${lead.id}`}>Screening summary</Label>
              <Textarea
                id={`screening-summary-${lead.id}`}
                value={form.screeningSummary}
                onChange={(event) =>
                  setForm({ screeningSummary: event.target.value })
                }
                placeholder="Availability, household needs, follow-up decision…"
                maxLength={4000}
                className="min-h-28 bg-card"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-secondary/40 p-4">
            <div>
              <h4 className="flex items-center gap-2 font-semibold">
                <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                Property tour
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Schedule and record the outcome of an in-person or virtual tour.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`tour-status-${lead.id}`}>Tour status</Label>
              <select
                id={`tour-status-${lead.id}`}
                className={selectClassName}
                value={form.tourStatus}
                onChange={(event) =>
                  changeTourStatus(event.target.value as WebsiteLeadTourStatus)
                }
              >
                {TOUR_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {tourStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`tour-date-${lead.id}`}>Tour date and time</Label>
              <Input
                id={`tour-date-${lead.id}`}
                type="datetime-local"
                value={form.tourScheduledAt}
                onChange={(event) =>
                  setForm({ tourScheduledAt: event.target.value })
                }
                required={form.tourStatus !== "NOT_SCHEDULED"}
                disabled={form.tourStatus === "NOT_SCHEDULED"}
              />
              <p className="text-xs text-muted-foreground">
                Time is shown in your current device time zone.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          Screening and tour controls appear only for rental inquiries.
        </p>
      )}
    </section>
  );
}
