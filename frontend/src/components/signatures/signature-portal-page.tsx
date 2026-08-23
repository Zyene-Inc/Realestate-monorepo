"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileCheck2,
  Loader2,
  PenLine,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import {
  documentTypeLabel,
  signatureStatusLabel,
  terminalSignatureStatuses,
  type CursorPage,
  type ESignatureEnvelope,
} from "@/lib/e-signatures";
import { getErrorMessage } from "@/lib/errors";
import { VerdocsSigningPanel } from "./verdocs-signing-panel";

export function SignaturePortalPage({
  portal,
}: {
  portal: "tenant" | "agent";
}) {
  const [items, setItems] = useState<ESignatureEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<ESignatureEnvelope | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page: CursorPage<ESignatureEnvelope> = await api.get(
        `/${portal}/e-signatures?limit=50`,
      );
      setItems(page.items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load documents"));
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const download = async (envelopeId: string, documentId: string) => {
    try {
      const result: { url: string } = await api.get(
        `/${portal}/e-signatures/${envelopeId}/documents/${documentId}/url`,
      );
      window.location.assign(result.url);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Download is unavailable"));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Secure documents
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Signatures and agreements
          </h1>
          <p className="mt-2 text-muted-foreground">
            Review, sign, and download completed Verdocs packages.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No documents have been assigned to you.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5">
          {items.map((envelope) => {
            const canSign = !terminalSignatureStatuses.has(envelope.status);
            return (
              <Card key={envelope.id} className="rounded-2xl">
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{envelope.title}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {documentTypeLabel(envelope.documentType)} · Expires{" "}
                      {new Date(envelope.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      envelope.status === "COMPLETED" ? "default" : "outline"
                    }
                    className="capitalize"
                  >
                    {signatureStatusLabel(envelope.status)}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  {canSign && (
                    <Button onClick={() => setSigning(envelope)}>
                      <PenLine className="mr-2 h-4 w-4" /> Review and sign
                    </Button>
                  )}
                  {envelope.documents.map((document) => (
                    <Button
                      key={document.id}
                      variant="outline"
                      onClick={() => download(envelope.id, document.id)}
                    >
                      {document.documentType === "CERTIFICATE" ? (
                        <FileCheck2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {document.documentType === "CERTIFICATE"
                        ? "Certificate"
                        : "Signed PDF"}
                    </Button>
                  ))}
                  {envelope.archivedAt && (
                    <p className="w-full text-xs text-muted-foreground">
                      Archived {new Date(envelope.archivedAt).toLocaleString()}{" "}
                      with SHA-256 integrity records.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(signing)}
        onOpenChange={(open) => !open && setSigning(null)}
      >
        <DialogContent className="max-h-[95dvh] max-w-[96vw] overflow-y-auto p-4 lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{signing?.title}</DialogTitle>
            <DialogDescription>
              Verdocs will email a one-time code to verify your identity before
              signing.
            </DialogDescription>
          </DialogHeader>
          {signing && (
            <VerdocsSigningPanel
              endpoint={`/${portal}/e-signatures/${signing.id}/signing-session`}
              onFinished={() => {
                setSigning(null);
                toast.success("Document signed");
                void load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
