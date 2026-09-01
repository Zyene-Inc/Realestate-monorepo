"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  ApplicationApplicantDetails,
  ApplicationDecisionPanel,
  ApplicationDocumentReview,
  ApplicationInternalNotes,
} from "./_components/application-review-sections";
import { ApplicationLeaseHandoff } from "./_components/application-lease-handoff";
import {
  addRentalApplicationNote,
  getAdminRentalApplication,
  getRentalApplicationAssignees,
  reviewRentalApplicationDocument,
  updateRentalApplicationWorkflow,
  type AdminRentalApplication,
  type RentalApplicationAssignee,
} from "@/lib/admin-rental-applications";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatApplicationStatus } from "@/lib/rental-applications";

const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function RentalApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<AdminRentalApplication | null>(
    null,
  );
  const [assignees, setAssignees] = useState<RentalApplicationAssignee[]>([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [documentReason, setDocumentReason] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [current, users] = await Promise.all([
        getAdminRentalApplication(id),
        getRentalApplicationAssignees(),
      ]);
      setApplication(current);
      setAssignees(users);
      setReason(current.decisionReason ?? "");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load application"));
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getAdminRentalApplication(id),
      getRentalApplicationAssignees(),
    ])
      .then(([current, users]) => {
        if (!active) return;
        setApplication(current);
        setAssignees(users);
        setReason(current.decisionReason ?? "");
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(getErrorMessage(error, "Unable to load application"));
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const workflow = async (
    input: Parameters<typeof updateRentalApplicationWorkflow>[1],
    success: string,
  ) => {
    if (!application) return;
    setBusy(true);
    try {
      const updated = await updateRentalApplicationWorkflow(application, input);
      setApplication(updated);
      setReason(updated.decisionReason ?? "");
      toast.success(success);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update application"));
    } finally {
      setBusy(false);
    }
  };

  const reviewDocument = async (
    documentId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    setBusy(true);
    try {
      await reviewRentalApplicationDocument(id, documentId, {
        status,
        rejectionReason:
          status === "REJECTED" ? documentReason[documentId] : undefined,
      });
      await load();
      toast.success(
        status === "ACCEPTED" ? "Document accepted" : "Document returned",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to review document"));
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (documentId: string) => {
    try {
      const result = (await api.post(
        `/admin/rental-applications/${id}/documents/${documentId}/download`,
        {},
      )) as { url: string };
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open document"));
    }
  };

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await addRentalApplicationNote(id, note);
      setNote("");
      await load();
      toast.success("Internal note added");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to add note"));
    } finally {
      setBusy(false);
    }
  };

  if (!application) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2
          className="size-7 animate-spin text-primary"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin/rental-applications"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All applications
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {application.firstName} {application.lastName}
              </h1>
              <Badge variant="outline" className="capitalize">
                {formatApplicationStatus(application.status)}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {application.property.name}
              {application.unit ? ` · Unit ${application.unit.unitNumber}` : ""}
              {application.submittedAt
                ? ` · Submitted ${formatter.format(new Date(application.submittedAt))}`
                : " · Draft"}
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label
              htmlFor="application-assignee"
              className="text-sm font-medium"
            >
              Assigned reviewer
            </label>
            <select
              id="application-assignee"
              className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
              value={application.assignedToUserId ?? ""}
              disabled={busy}
              onChange={(event) =>
                void workflow(
                  event.target.value
                    ? { assignedToUserId: event.target.value }
                    : { clearAssignment: true },
                  "Reviewer updated",
                )
              }
            >
              <option value="">Unassigned</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {application.status === "APPROVED" && (
        <ApplicationLeaseHandoff application={application} onChanged={load} />
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="space-y-8">
          <ApplicationApplicantDetails application={application} />
          <ApplicationDocumentReview
            application={application}
            busy={busy}
            reasons={documentReason}
            onReasonChange={(documentId, value) =>
              setDocumentReason((current) => ({
                ...current,
                [documentId]: value,
              }))
            }
            onOpen={(documentId) => void openDocument(documentId)}
            onReview={(documentId, status) =>
              void reviewDocument(documentId, status)
            }
          />
          <ApplicationInternalNotes
            application={application}
            note={note}
            busy={busy}
            onNoteChange={setNote}
            onSubmit={(event) => void submitNote(event)}
          />
        </div>
        <ApplicationDecisionPanel
          application={application}
          reason={reason}
          busy={busy}
          onReasonChange={setReason}
          onWorkflow={(input, success) => void workflow(input, success)}
        />
      </div>
    </div>
  );
}
