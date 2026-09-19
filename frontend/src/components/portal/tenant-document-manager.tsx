"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

type TenantDocument = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  uploadedBy: { email: string } | null;
};

const ADMIN_TYPES = [
  ["LEASE", "Lease"],
  ["NOTICE", "Notice"],
  ["INSPECTION", "Inspection"],
  ["PAYMENT_RECEIPT", "Payment receipt"],
  ["IDENTIFICATION", "Identification"],
  ["INSURANCE", "Insurance"],
  ["OTHER", "Other"],
] as const;

const TENANT_TYPES = ADMIN_TYPES.filter(([type]) =>
  ["IDENTIFICATION", "INSURANCE", "OTHER"].includes(type),
);

const ACCEPTED_TYPES = "application/pdf,image/jpeg,image/png,image/webp";

function labelForType(type: string) {
  return ADMIN_TYPES.find(([value]) => value === type)?.[1] ?? "Document";
}

function isSafeDownloadUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("https://");
}

export function TenantDocumentManager({
  tenantId,
  tenantName,
}: {
  tenantId?: string;
  tenantName?: string;
}) {
  const isAdmin = Boolean(tenantId);
  const basePath = isAdmin
    ? `/admin/tenants/${tenantId}/documents`
    : "/tenant/portal/documents";
  const supportedTypes = isAdmin ? ADMIN_TYPES : TENANT_TYPES;
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [type, setType] = useState<(typeof ADMIN_TYPES)[number][0]>(
    supportedTypes[0][0],
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await api.get(basePath)) as TenantDocument[];
      setDocuments(rows);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load documents"));
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      toast.error("Upload a PDF, JPEG, PNG, or WebP document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Documents must be 10 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const signed = (await api.post(`${basePath}/upload-url`, {
        fileName: file.name,
        type,
        contentType: file.type,
      })) as { bucket: string; path: string; token: string };
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;
      await api.post(basePath, {
        path: signed.path,
        fileName: file.name,
        type,
        contentType: file.type,
      });
      toast.success("Document uploaded securely");
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to upload document"));
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (documentId: string) => {
    setWorkingId(documentId);
    try {
      const result = (await api.get(
        `${basePath}/${documentId}/download-url`,
      )) as { url?: unknown };
      if (!isSafeDownloadUrl(result.url))
        throw new Error("Download unavailable");
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open document"));
    } finally {
      setWorkingId(null);
    }
  };

  const removeDocument = async (documentId: string) => {
    if (
      !window.confirm("Remove this private document? This cannot be undone.")
    ) {
      return;
    }
    setWorkingId(documentId);
    try {
      await api.delete(`${basePath}/${documentId}`);
      toast.success("Document removed");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to remove document"));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Secure records</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {isAdmin
              ? `${tenantName ?? "Resident"} documents`
              : "Your documents"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Private documents are available only to the resident and authorized
            Coach Johnson Realty staff.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`tenant-document-type-${tenantId ?? "self"}`}>
              Type
            </Label>
            <select
              id={`tenant-document-type-${tenantId ?? "self"}`}
              className="h-10 rounded-xl border border-input bg-card px-3 text-sm"
              value={type}
              onChange={(event) =>
                setType(event.target.value as (typeof ADMIN_TYPES)[number][0])
              }
              disabled={uploading}
            >
              {supportedTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload aria-hidden="true" />
            )}
            Upload document
          </Button>
          <input
            ref={fileInput}
            className="hidden"
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No private documents have been added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((document) => (
            <Card key={document.id} size="sm">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <CardTitle className="truncate">{document.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labelForType(document.type)} · Added{" "}
                      {new Date(document.createdAt).toLocaleDateString()}
                      {isAdmin && document.uploadedBy?.email
                        ? ` by ${document.uploadedBy.email}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={workingId === document.id}
                    onClick={() => void openDocument(document.id)}
                  >
                    <Download aria-hidden="true" /> Open
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={workingId === document.id}
                    onClick={() => void removeDocument(document.id)}
                  >
                    <Trash2 aria-hidden="true" /> Remove
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function TenantDocumentsDialog({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" size="sm" variant="outline" />}
      >
        Documents
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Resident documents</DialogTitle>
          <DialogDescription>
            Upload and manage private records for {tenantName}.
          </DialogDescription>
        </DialogHeader>
        <TenantDocumentManager tenantId={tenantId} tenantName={tenantName} />
      </DialogContent>
    </Dialog>
  );
}
