import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Ban, Download, Loader2, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signatureStatusLabel,
  terminalSignatureStatuses,
  type ESignatureEnvelope,
  type ESignatureEvent,
} from "@/lib/e-signatures";

export type ESignatureTemplate = {
  id: string;
  name: string;
  documentType: "LEASE" | "DISCLOSURE" | "AGREEMENT";
  description: string | null;
  roles: Array<{ name: string; type: string }>;
};

export type ESignatureTenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ESignatureAgent = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
};

export type ESignatureLease = {
  id: string;
  tenant: ESignatureTenant;
  unit: { unitNumber: string; property: { name: string } };
};

export type ESignatureForm = {
  templateId: string;
  documentType: "LEASE" | "DISCLOSURE" | "AGREEMENT";
  targetType: "TENANT" | "AGENT";
  targetId: string;
  leaseId: string;
  title: string;
};

type CreateDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: ESignatureForm;
  setForm: Dispatch<SetStateAction<ESignatureForm>>;
  templates: ESignatureTemplate[];
  targetOptions: Array<ESignatureTenant | ESignatureAgent>;
  eligibleLeases: ESignatureLease[];
  role?: string;
  selectedRole?: { name: string; type: string };
  working: boolean;
  onSubmit: (event: FormEvent) => Promise<void>;
};

export function ESignatureCreateDialog({
  open,
  setOpen,
  form,
  setForm,
  templates,
  targetOptions,
  eligibleLeases,
  role,
  selectedRole,
  working,
  onSubmit,
}: CreateDialogProps) {
  const documentTemplates: ESignatureTemplate[] = [];
  for (const template of templates) {
    if (template.documentType === form.documentType) {
      documentTemplates.push(template);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Create Verdocs envelope</DialogTitle>
            <DialogDescription>
              Only use Johnson Realty legal-approved templates. Sending uses one
              of the 25 monthly free envelopes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="esign-template">Template</Label>
              <select
                id="esign-template"
                className="h-11 w-full rounded-md border bg-background px-3"
                value={form.templateId}
                onChange={(event) => {
                  const template = templates.find(
                    (item) => item.id === event.target.value,
                  );
                  setForm({
                    ...form,
                    templateId: event.target.value,
                    title: template?.name || form.title,
                  });
                }}
                required
              >
                <option value="">Select approved template…</option>
                {documentTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="esign-type">Document type</Label>
              <select
                id="esign-type"
                className="h-11 w-full rounded-md border bg-background px-3"
                value={form.documentType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    documentType: event.target
                      .value as ESignatureForm["documentType"],
                    templateId: "",
                    leaseId: "",
                    title: "",
                  })
                }
              >
                <option value="LEASE" disabled={form.targetType === "AGENT"}>
                  Lease
                </option>
                <option value="DISCLOSURE">Disclosure</option>
                <option value="AGREEMENT">Agreement</option>
              </select>
            </div>
            {role === "SUPER_ADMIN" && (
              <div className="space-y-2">
                <Label htmlFor="esign-target-type">Recipient type</Label>
                <select
                  id="esign-target-type"
                  className="h-11 w-full rounded-md border bg-background px-3"
                  value={form.targetType}
                  onChange={(event) => {
                    const targetType = event.target
                      .value as ESignatureForm["targetType"];
                    setForm({
                      ...form,
                      targetType,
                      targetId: "",
                      leaseId: "",
                      documentType:
                        targetType === "AGENT" && form.documentType === "LEASE"
                          ? "AGREEMENT"
                          : form.documentType,
                    });
                  }}
                >
                  <option value="TENANT">Tenant</option>
                  <option value="AGENT">Approved agent</option>
                </select>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="esign-target">Recipient</Label>
              <select
                id="esign-target"
                className="h-11 w-full rounded-md border bg-background px-3"
                value={form.targetId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    targetId: event.target.value,
                    leaseId: "",
                  })
                }
                required
              >
                <option value="">Select recipient…</option>
                {targetOptions.map((target) => (
                  <option key={target.id} value={target.id}>
                    {"companyName" in target
                      ? `${target.companyName} · ${target.contactName}`
                      : `${target.firstName} ${target.lastName}`}{" "}
                    · {target.email}
                  </option>
                ))}
              </select>
            </div>
            {form.documentType === "LEASE" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="esign-lease">Lease</Label>
                <select
                  id="esign-lease"
                  className="h-11 w-full rounded-md border bg-background px-3"
                  value={form.leaseId}
                  onChange={(event) =>
                    setForm({ ...form, leaseId: event.target.value })
                  }
                  required
                >
                  <option value="">Select matching lease…</option>
                  {eligibleLeases.map((lease) => (
                    <option key={lease.id} value={lease.id}>
                      {lease.unit.property.name} · Unit {lease.unit.unitNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="esign-title">Envelope title</Label>
              <Input
                id="esign-title"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                maxLength={200}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={working || !selectedRole}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send securely
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DetailsDialogProps = {
  selected: ESignatureEnvelope | null;
  events: ESignatureEvent[];
  working: boolean;
  onClose: () => void;
  onAction: (action: "synchronize" | "remind" | "cancel") => Promise<void>;
  onDownload: (documentId: string) => Promise<void>;
};

export function ESignatureDetailsDialog({
  selected,
  events,
  working,
  onClose,
  onAction,
  onDownload,
}: DetailsDialogProps) {
  return (
    <Dialog
      open={Boolean(selected)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription>
            {selected?.recipientEmail} · Verdocs status and immutable event
            history.
          </DialogDescription>
        </DialogHeader>
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="capitalize">
                {signatureStatusLabel(selected.status)}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void onAction("synchronize")}
                disabled={working}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync
              </Button>
              {!terminalSignatureStatuses.has(selected.status) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onAction("remind")}
                    disabled={working}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Remind
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void onAction("cancel")}
                    disabled={working}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.documents.map((document) => (
                <Button
                  key={document.id}
                  variant="outline"
                  onClick={() => void onDownload(document.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {document.documentType === "CERTIFICATE"
                    ? "Certificate"
                    : "Signed PDF"}
                </Button>
              ))}
            </div>
            <div>
              <h3 className="font-semibold">Audit timeline</h3>
              <ol className="mt-4 space-y-3 border-l pl-5">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[1.48rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm font-medium">
                      {event.eventType.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()} ·{" "}
                      {event.source}
                      {event.actor ? ` · ${event.actor}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
