"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  formatInspectionDateTime,
  type MoveInInspection,
} from "@/lib/move-in-inspections";

export function InspectionWorkflowActions({
  inspection,
  onUpdated,
}: {
  inspection: MoveInInspection;
  onUpdated: (inspection: MoveInInspection) => void;
}) {
  const [reopenReason, setReopenReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function mutate(
    path: string,
    body: Record<string, unknown>,
    success: string,
  ) {
    setBusy(path);
    try {
      const updated = (await api.post(
        `/admin/move-in-inspections/${inspection.id}/${path}`,
        { expectedRevision: inspection.revision, ...body },
      )) as MoveInInspection;
      onUpdated(updated);
      setReopenReason("");
      setCancelReason("");
      toast.success(success);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update inspection"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {inspection.acknowledgement ? (
        <section className="rounded-[1.25rem] border border-primary/25 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">
                Resident acknowledgement recorded
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {inspection.acknowledgement.typedName} acknowledged revision{" "}
                {inspection.acknowledgement.inspectionRevision} on{" "}
                {formatInspectionDateTime(
                  inspection.acknowledgement.acknowledgedAt,
                )}
                .
              </p>
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                Record SHA-256: {inspection.acknowledgement.recordSha256}
              </p>
              {inspection.acknowledgement.tenantNotes ? (
                <p className="mt-3 text-sm">
                  Resident note: {inspection.acknowledgement.tenantNotes}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {inspection.status === "DRAFT" ? (
        <section className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Send for resident review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The checklist and handover record become read-only while the
              resident reviews them.
            </p>
            {!inspection.readiness.ready ? (
              <p className="mt-2 text-sm font-medium text-destructive">
                Finish all condition items and key access first.
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={!inspection.readiness.ready || busy === "send-to-tenant"}
            onClick={() =>
              void mutate("send-to-tenant", {}, "Inspection sent to resident")
            }
          >
            {busy === "send-to-tenant" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send />
            )}
            Send to resident
          </Button>
        </section>
      ) : null}

      {inspection.status === "READY_FOR_TENANT" ? (
        <section className="space-y-4 rounded-[1.25rem] border border-border bg-card p-5">
          <div>
            <h2 className="font-semibold">
              Waiting for resident acknowledgement
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reopen only when the staff record needs correction. Resident
              observations remain preserved.
            </p>
          </div>
          <Textarea
            value={reopenReason}
            onChange={(event) => setReopenReason(event.target.value)}
            maxLength={1000}
            placeholder="Reason for reopening"
          />
          <Button
            type="button"
            variant="outline"
            disabled={reopenReason.trim().length < 3 || busy === "reopen"}
            onClick={() =>
              void mutate(
                "reopen",
                { reason: reopenReason },
                "Inspection returned to draft",
              )
            }
          >
            <RotateCcw />
            Reopen draft
          </Button>
        </section>
      ) : null}

      {["DRAFT", "READY_FOR_TENANT"].includes(inspection.status) ? (
        <details className="rounded-2xl border border-border p-5">
          <summary className="cursor-pointer font-semibold">
            Cancel this inspection
          </summary>
          <div className="mt-4 space-y-3">
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              maxLength={1000}
              placeholder="Required cancellation reason"
            />
            <Button
              type="button"
              variant="destructive"
              disabled={cancelReason.trim().length < 3 || busy === "cancel"}
              onClick={() =>
                void mutate(
                  "cancel",
                  { reason: cancelReason },
                  "Inspection canceled",
                )
              }
            >
              <XCircle />
              Cancel inspection
            </Button>
          </div>
        </details>
      ) : null}
    </>
  );
}
