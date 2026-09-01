import type { FormEvent } from "react";
import { Check, ExternalLink, FileText, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRentalApplication } from "@/lib/admin-rental-applications";
import type { RentalApplicationStatus } from "@/lib/rental-applications";
import { formatCurrency } from "@/lib/sale-listings";

const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ApplicationApplicantDetails({
  application,
}: {
  application: AdminRentalApplication;
}) {
  const details = [
    ["Email", application.email],
    ["Phone", application.phone],
    ["Date of birth", new Date(application.dateOfBirth).toLocaleDateString()],
    ["Move-in date", new Date(application.moveInDate).toLocaleDateString()],
    ["Household size", application.householdSize],
    ["Employment", application.employmentStatus],
    ["Employer", application.employerName || "Not provided"],
    [
      "Gross monthly income",
      formatCurrency(Number(application.monthlyGrossIncome)),
    ],
    [
      "Other monthly income",
      formatCurrency(Number(application.additionalIncome)),
    ],
    [
      "Current address",
      `${application.currentAddress}, ${application.currentCity}, ${application.currentState} ${application.currentZip}`,
    ],
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Applicant details</h2>
      <dl className="mt-5 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {[
        ["Other occupants", application.occupantsDescription],
        ["Pets", application.petsDescription],
        ["Rental history", application.rentalHistory],
      ].map(([label, value]) =>
        value ? (
          <div key={label} className="mt-5 border-t border-border pt-5 text-sm">
            <p className="text-muted-foreground">{label}</p>
            <p className="mt-2 whitespace-pre-line leading-6">{value}</p>
          </div>
        ) : null,
      )}
    </section>
  );
}

export function ApplicationDocumentReview({
  application,
  busy,
  reasons,
  onReasonChange,
  onOpen,
  onReview,
}: {
  application: AdminRentalApplication;
  busy: boolean;
  reasons: Record<string, string>;
  onReasonChange: (documentId: string, reason: string) => void;
  onOpen: (documentId: string) => void;
  onReview: (documentId: string, status: "ACCEPTED" | "REJECTED") => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold">Identity and income documents</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Open each private file, then explicitly accept it or return it with a reason.
      </p>
      <div className="mt-5 space-y-4">
        {application.documents.map((document) => (
          <div key={document.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="truncate font-semibold">{document.originalFileName}</h3>
                </div>
                <p className="mt-2 text-sm capitalize text-muted-foreground">
                  {document.type.replaceAll("_", " ").toLowerCase()} · {document.status.toLowerCase()}
                </p>
              </div>
              <Button variant="outline" onClick={() => onOpen(document.id)}>
                <ExternalLink /> Open securely
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <Input
                aria-label={`Rejection reason for ${document.originalFileName}`}
                placeholder="Reason required only when returning"
                value={reasons[document.id] ?? ""}
                onChange={(event) => onReasonChange(document.id, event.target.value)}
              />
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onReview(document.id, "ACCEPTED")}
              >
                <Check /> Accept
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                disabled={busy || !reasons[document.id]?.trim()}
                onClick={() => onReview(document.id, "REJECTED")}
              >
                <X /> Return
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ApplicationInternalNotes({
  application,
  note,
  busy,
  onNoteChange,
  onSubmit,
}: {
  application: AdminRentalApplication;
  note: string;
  busy: boolean;
  onNoteChange: (note: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold">Internal notes</h2>
      <form className="mt-4 flex gap-3" onSubmit={onSubmit}>
        <Input
          aria-label="Internal application note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add screening or follow-up context"
        />
        <Button disabled={busy || !note.trim()} type="submit">
          <MessageSquareText /> Add note
        </Button>
      </form>
      <div className="mt-4 space-y-3">
        {application.notes.map((item) => (
          <div key={item.id} className="rounded-xl bg-secondary px-4 py-3 text-sm">
            <p className="leading-6">{item.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.author.email} · {formatter.format(new Date(item.createdAt))}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ApplicationDecisionPanel({
  application,
  reason,
  busy,
  onReasonChange,
  onWorkflow,
}: {
  application: AdminRentalApplication;
  reason: string;
  busy: boolean;
  onReasonChange: (reason: string) => void;
  onWorkflow: (
    input: { status: RentalApplicationStatus; decisionReason?: string },
    success: string,
  ) => void;
}) {
  const terminal = ["APPROVED", "DENIED", "WITHDRAWN"].includes(application.status);
  return (
    <aside className="rounded-2xl border border-border bg-card p-5 xl:sticky xl:top-24">
      <h2 className="font-semibold">Review decision</h2>
      <dl className="mt-4 space-y-3 border-y border-border py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Fee</dt>
          <dd className="font-semibold capitalize">
            {application.feeStatus.replaceAll("_", " ").toLowerCase()}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-semibold">{formatCurrency(Number(application.feeAmount))}</dd>
        </div>
      </dl>
      {!terminal ? (
        <>
          <Label htmlFor="decision-reason" className="mt-5 block">
            Applicant-facing explanation
          </Label>
          <Textarea
            id="decision-reason"
            className="mt-2 min-h-28"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Required when requesting information or denying"
          />
          <div className="mt-4 grid gap-2">
            {application.status !== "UNDER_REVIEW" ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onWorkflow({ status: "UNDER_REVIEW" }, "Review started")}
              >
                Begin review
              </Button>
            ) : null}
            <Button
              variant="outline"
              disabled={busy || !reason.trim()}
              onClick={() =>
                onWorkflow(
                  { status: "NEEDS_INFORMATION", decisionReason: reason },
                  "Information requested",
                )
              }
            >
              Request information
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                onWorkflow(
                  { status: "APPROVED", decisionReason: reason || undefined },
                  "Application approved",
                )
              }
            >
              Approve application
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              disabled={busy || !reason.trim()}
              onClick={() =>
                onWorkflow(
                  { status: "DENIED", decisionReason: reason },
                  "Application denied",
                )
              }
            >
              Deny application
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          This application has a final status. Internal notes remain available
          for audit context.
        </p>
      )}
    </aside>
  );
}
