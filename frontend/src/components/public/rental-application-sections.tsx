import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileUp,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ApplicationFormFields } from "@/components/public/application-form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatApplicationStatus,
  type RentalApplication,
  type RentalApplicationDocument,
  type RentalApplicationForm,
} from "@/lib/rental-applications";
import { formatCurrency } from "@/lib/sale-listings";

function DocumentUpload({
  application,
  type,
  label,
  description,
  busy,
  onUpload,
  onRemove,
}: {
  application: RentalApplication;
  type: RentalApplicationDocument["type"];
  label: string;
  description: string;
  busy: boolean;
  onUpload: (file: File, type: RentalApplicationDocument["type"]) => void;
  onRemove: (documentId: string) => void;
}) {
  const documents = application.documents.filter(
    (document) => document.type === type,
  );
  return (
    <div className="border-t border-border py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-input bg-card px-4 text-sm font-semibold hover:bg-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 size-4" />
          )}
          Upload
          <input
            className="sr-only"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUpload(file, type);
            }}
          />
        </label>
      </div>
      {documents.length ? (
        <ul className="mt-4 space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/70 px-4 py-3 text-sm"
            >
              <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {document.originalFileName}
              </span>
              <Badge variant="outline">{document.status.toLowerCase()}</Badge>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${document.originalFileName}`}
                disabled={busy}
                onClick={() => onRemove(document.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
              {document.rejectionReason ? (
                <p className="w-full text-destructive">
                  {document.rejectionReason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ApplicantDetailsEditor({
  form,
  editing,
  busy,
  onFormChange,
  onEditingChange,
  onSave,
}: {
  form: RentalApplicationForm;
  editing: boolean;
  busy: boolean;
  onFormChange: (form: RentalApplicationForm) => void;
  onEditingChange: (editing: boolean) => void;
  onSave: () => void;
}) {
  return (
    <section aria-labelledby="application-details-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="application-details-heading"
            className="text-2xl font-semibold tracking-[-0.035em]"
          >
            Application details
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Review and correct your information before submitting.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onEditingChange(!editing)}
        >
          {editing ? "Cancel editing" : "Edit details"}
        </Button>
      </div>
      {editing ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <ApplicationFormFields form={form} onChange={onFormChange} />
          <Button
            type="button"
            className="mt-6"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            Save details
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function ApplicantDocuments({
  application,
  busy,
  onUpload,
  onRemove,
}: {
  application: RentalApplication;
  busy: boolean;
  onUpload: (file: File, type: RentalApplicationDocument["type"]) => void;
  onRemove: (documentId: string) => void;
}) {
  return (
    <section aria-labelledby="documents-heading">
      <h2
        id="documents-heading"
        className="text-2xl font-semibold tracking-[-0.035em]"
      >
        Supporting documents
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Files are stored privately. Do not upload Social Security numbers, bank
        credentials, or full payment-card details.
      </p>
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <DocumentUpload
          application={application}
          type="GOVERNMENT_ID"
          label="Government-issued photo ID"
          description="Upload a readable driver’s license, state ID, or passport."
          busy={busy}
          onUpload={onUpload}
          onRemove={onRemove}
        />
        <DocumentUpload
          application={application}
          type="INCOME_PROOF"
          label="Proof of income"
          description="Upload recent pay statements or another lawful proof of income."
          busy={busy}
          onUpload={onUpload}
          onRemove={onRemove}
        />
        <DocumentUpload
          application={application}
          type="OTHER"
          label="Additional document"
          description="Optional supporting document requested by the rental team."
          busy={busy}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      </div>
    </section>
  );
}

export function ApplicantSubmission({
  busy,
  certified,
  documentsReady,
  onCertifiedChange,
  onSubmit,
}: {
  busy: boolean;
  certified: boolean;
  documentsReady: boolean;
  onCertifiedChange: (certified: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="border-t border-border pt-7">
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={certified}
          onChange={(event) => onCertifiedChange(event.target.checked)}
        />
        <span>
          I certify that this application is accurate and authorize Johnson
          Realty to verify the information for rental screening. I understand
          that application fees, when shown, are paid only after I submit.
        </span>
      </label>
      <Button
        className="mt-5"
        disabled={busy || !certified || !documentsReady}
        onClick={onSubmit}
      >
        {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
        Submit application
      </Button>
      {!documentsReady ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Add both required document categories to continue.
        </p>
      ) : null}
    </section>
  );
}

export function ApplicationStatusCard({
  application,
  busy,
  onPayFee,
}: {
  application: RentalApplication;
  busy: boolean;
  onPayFee: () => void;
}) {
  const router = useRouter();
  return (
    <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
        Application status
      </p>
      <p className="mt-3 text-xl font-semibold capitalize">
        {formatApplicationStatus(application.status)}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {application.property.name}
        {application.unit ? ` · Unit ${application.unit.unitNumber}` : ""}
      </p>
      <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Documents</dt>
          <dd className="font-semibold">{application.documents.length}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Application fee</dt>
          <dd className="text-right font-semibold">
            {Number(application.feeAmount) === 0
              ? "No fee"
              : formatCurrency(Number(application.feeAmount))}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Fee status</dt>
          <dd className="font-semibold capitalize">
            {application.feeStatus.replaceAll("_", " ").toLowerCase()}
          </dd>
        </div>
      </dl>
      {application.status === "FEE_PENDING" &&
      application.feeStatus !== "PAID" ? (
        <Button className="mt-5 w-full" disabled={busy} onClick={onPayFee}>
          {busy ? <Loader2 className="animate-spin" /> : <ExternalLink />}
          Pay securely with Stripe
        </Button>
      ) : null}
      {application.status === "APPROVED" ? (
        <div className="mt-5 flex gap-3 rounded-xl bg-secondary p-4 text-sm leading-6">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          The rental team will contact you about lease and move-in steps.
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="mt-4 w-full"
        onClick={() => router.push(`/rentals/${application.propertyId}`)}
      >
        Back to property
      </Button>
    </aside>
  );
}
