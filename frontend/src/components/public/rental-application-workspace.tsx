"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApplicantDetailsEditor,
  ApplicantDocuments,
  ApplicantSubmission,
  ApplicationStatusCard,
} from "@/components/public/rental-application-sections";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  createApplicationFeeCheckout,
  getRentalApplication,
  rentalApplicationFormFor,
  submitRentalApplication,
  updateRentalApplication,
  type RentalApplication,
  type RentalApplicationDocument,
} from "@/lib/rental-applications";
import { supabase } from "@/lib/supabase";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maximumBytes = 10 * 1024 * 1024;

export function RentalApplicationWorkspace({
  initialApplication,
}: {
  initialApplication: RentalApplication;
}) {
  const [application, setApplication] = useState(initialApplication);
  const [busy, setBusy] = useState(false);
  const [certified, setCertified] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [form, setForm] = useState(() =>
    rentalApplicationFormFor(initialApplication),
  );

  useEffect(() => {
    if (
      application.status !== "FEE_PENDING" ||
      application.feeStatus !== "OPEN"
    ) {
      return;
    }
    let active = true;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void getRentalApplication(application.id)
        .then((current) => {
          if (active) setApplication(current);
        })
        .catch(() => undefined);
      if (attempts >= 15) window.clearInterval(interval);
    }, 2_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [application.feeStatus, application.id, application.status]);

  const refresh = async () => {
    const current = await getRentalApplication(application.id);
    setApplication(current);
    return current;
  };

  const uploadDocument = async (
    file: File,
    type: RentalApplicationDocument["type"],
  ) => {
    if (!allowedTypes.has(file.type) || file.size > maximumBytes) {
      toast.error("Use a PDF, JPEG, PNG, or WebP file no larger than 10 MB");
      return;
    }
    setBusy(true);
    try {
      const input = {
        type,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      };
      const signed = (await api.post(
        `/public/rental-applications/${application.id}/document-upload-url`,
        input,
      )) as { bucket: string; path: string; token: string };
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;
      await api.post(
        `/public/rental-applications/${application.id}/documents`,
        { ...input, path: signed.path },
      );
      await refresh();
      toast.success("Document uploaded securely");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to upload document"));
    } finally {
      setBusy(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    setBusy(true);
    try {
      await api.delete(
        `/public/rental-applications/${application.id}/documents/${documentId}`,
      );
      await refresh();
      toast.success("Document removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to remove document"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result = await submitRentalApplication(application, certified);
      setApplication(result.application);
      window.history.replaceState(
        {},
        "",
        `/rentals/applications/${application.id}`,
      );
      toast.success("Application submitted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to submit application"));
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async () => {
    setBusy(true);
    try {
      const updated = await updateRentalApplication(application, form);
      setApplication(updated);
      setForm(rentalApplicationFormFor(updated));
      setEditingDetails(false);
      toast.success("Application details updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update application"));
    } finally {
      setBusy(false);
    }
  };

  const payFee = async () => {
    setBusy(true);
    try {
      const checkout = await createApplicationFeeCheckout(application.id);
      if (checkout.url) window.location.assign(checkout.url);
      else await refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open secure payment"));
    } finally {
      setBusy(false);
    }
  };

  const editable =
    application.status === "DRAFT" || application.status === "NEEDS_INFORMATION";
  const requiredTypes = new Set(application.documents.map((document) => document.type));
  const documentsReady =
    requiredTypes.has("GOVERNMENT_ID") && requiredTypes.has("INCOME_PROOF");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-8">
        {application.decisionReason ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
            <p className="font-semibold">Message from the rental team</p>
            <p className="mt-1">{application.decisionReason}</p>
          </div>
        ) : null}

        {editable ? (
          <ApplicantDetailsEditor
            form={form}
            editing={editingDetails}
            busy={busy}
            onFormChange={setForm}
            onEditingChange={setEditingDetails}
            onSave={() => void saveDetails()}
          />
        ) : null}

        {editable ? (
          <ApplicantDocuments
            application={application}
            busy={busy}
            onUpload={(file, type) => void uploadDocument(file, type)}
            onRemove={(documentId) => void removeDocument(documentId)}
          />
        ) : (
          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.035em]">
              Application received
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Johnson Realty will review your application and contact you if
              additional information is needed. A submitted application is not
              a lease or guarantee of approval.
            </p>
          </section>
        )}

        {editable ? (
          <ApplicantSubmission
            busy={busy}
            certified={certified}
            documentsReady={documentsReady}
            onCertifiedChange={setCertified}
            onSubmit={() => void submit()}
          />
        ) : null}
      </div>

      <ApplicationStatusCard
        application={application}
        busy={busy}
        onPayFee={() => void payFee()}
      />
    </div>
  );
}
