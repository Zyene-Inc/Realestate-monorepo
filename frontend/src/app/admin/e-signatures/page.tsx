"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Download,
  FileSignature,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  documentTypeLabel,
  signatureStatusLabel,
  terminalSignatureStatuses,
  type CursorPage,
  type ESignatureEnvelope,
  type ESignatureEvent,
} from "@/lib/e-signatures";
import { getErrorMessage } from "@/lib/errors";

type Template = {
  id: string;
  name: string;
  documentType: "LEASE" | "DISCLOSURE" | "AGREEMENT";
  description: string | null;
  roles: Array<{ name: string; type: string }>;
};
type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
type Agent = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
};
type Lease = {
  id: string;
  tenant: Tenant;
  unit: { unitNumber: string; property: { name: string } };
};
type Configuration = {
  enabled: boolean;
  apiConfigured: boolean;
  webhookConfigured: boolean;
  plan: string;
};

const emptyForm = {
  templateId: "",
  documentType: "LEASE" as "LEASE" | "DISCLOSURE" | "AGREEMENT",
  targetType: "TENANT" as "TENANT" | "AGENT",
  targetId: "",
  leaseId: "",
  title: "",
};

export default function AdminESignaturesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ESignatureEnvelope[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<ESignatureEnvelope | null>(null);
  const [events, setEvents] = useState<ESignatureEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [config, page] = await Promise.all([
        api.get("/admin/e-signatures/configuration") as Promise<Configuration>,
        api.get("/admin/e-signatures?limit=50") as Promise<
          CursorPage<ESignatureEnvelope>
        >,
      ]);
      setConfiguration(config);
      setItems(page.items);
      if (config.apiConfigured) {
        setTemplates(await api.get("/admin/e-signatures/templates"));
      }
      if (user?.role !== "SALES_ADMIN") {
        const [tenantRows, leaseRows] = await Promise.all([
          api.get("/admin/tenants"),
          api.get("/admin/leases"),
        ]);
        setTenants(tenantRows);
        setLeases(leaseRows);
      }
      if (user?.role !== "TENANT_ADMIN") {
        setAgents(await api.get("/agents?status=APPROVED"));
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load e-signatures"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      ...(user?.role === "SALES_ADMIN"
        ? { targetType: "AGENT" as const, documentType: "AGREEMENT" as const }
        : {}),
    });
    setCreateOpen(true);
  };

  const selectedTemplate = templates.find(
    (item) => item.id === form.templateId,
  );
  const selectedRole = selectedTemplate?.roles.find((role) =>
    ["signer", "approver"].includes(role.type),
  );
  const targetOptions = form.targetType === "TENANT" ? tenants : agents;
  const eligibleLeases = useMemo(
    () =>
      leases.filter(
        (lease) => !form.targetId || lease.tenant.id === form.targetId,
      ),
    [form.targetId, leases],
  );

  const createEnvelope = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRole)
      return toast.error("Select a template with one signer role");
    setWorking(true);
    try {
      await api.post("/admin/e-signatures", {
        clientRequestId: crypto.randomUUID(),
        templateId: form.templateId,
        documentType: form.documentType,
        targetType: form.targetType,
        targetId: form.targetId,
        ...(form.documentType === "LEASE" ? { leaseId: form.leaseId } : {}),
        recipientRoleName: selectedRole.name,
        title: form.title,
      });
      toast.success("Verdocs envelope sent");
      setCreateOpen(false);
      setForm(emptyForm);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to create envelope"));
    } finally {
      setWorking(false);
    }
  };

  const openDetails = async (envelope: ESignatureEnvelope) => {
    setSelected(envelope);
    try {
      const page: CursorPage<ESignatureEvent> = await api.get(
        `/admin/e-signatures/${envelope.id}/events?limit=100`,
      );
      setEvents(page.items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load audit history"));
    }
  };

  const act = async (action: "synchronize" | "remind" | "cancel") => {
    if (!selected) return;
    setWorking(true);
    try {
      const updated = await api.post(
        `/admin/e-signatures/${selected.id}/${action}`,
        {},
      );
      if (action !== "remind") setSelected(updated);
      toast.success(action === "remind" ? "Reminder sent" : "Envelope updated");
      await load();
      await openDetails(action === "remind" ? selected : updated);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Unable to ${action} envelope`));
    } finally {
      setWorking(false);
    }
  };

  const download = async (documentId: string) => {
    if (!selected) return;
    try {
      const result: { url: string } = await api.get(
        `/admin/e-signatures/${selected.id}/documents/${documentId}/url`,
      );
      window.location.assign(result.url);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Download is unavailable"));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Verdocs · Free 25 envelopes/month"
        title="E-signature operations"
        description="Issue lease, disclosure, and agent agreement packages; monitor every signing event; retain final PDFs and certificates."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={openCreate}
              disabled={!configuration?.apiConfigured}
            >
              <FileSignature className="mr-2 h-4 w-4" />
              New envelope
            </Button>
          </>
        }
      />

      {configuration &&
        (!configuration.apiConfigured || !configuration.webhookConfigured) && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4 text-sm">
              Verdocs is safely disabled until API credentials and the webhook
              secret are configured in Vercel.
            </CardContent>
          </Card>
        )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No e-signature envelopes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openDetails(item)}
              className="rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.agent?.companyName ||
                        (item.tenant
                          ? `${item.tenant.firstName} ${item.tenant.lastName}`
                          : item.recipientEmail)}{" "}
                      · {documentTypeLabel(item.documentType)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "COMPLETED" ? "default" : "outline"
                    }
                    className="capitalize"
                  >
                    {signatureStatusLabel(item.status)}
                  </Badge>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={createEnvelope} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Create Verdocs envelope</DialogTitle>
              <DialogDescription>
                Only use Johnson Realty legal-approved templates. Sending uses
                one of the 25 monthly free envelopes.
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
                  {templates
                    .filter(
                      (template) => template.documentType === form.documentType,
                    )
                    .map((template) => (
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
                        .value as typeof form.documentType,
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
              {user?.role === "SUPER_ADMIN" && (
                <div className="space-y-2">
                  <Label htmlFor="esign-target-type">Recipient type</Label>
                  <select
                    id="esign-target-type"
                    className="h-11 w-full rounded-md border bg-background px-3"
                    value={form.targetType}
                    onChange={(event) => {
                      const targetType = event.target
                        .value as typeof form.targetType;
                      setForm({
                        ...form,
                        targetType,
                        targetId: "",
                        leaseId: "",
                        documentType:
                          targetType === "AGENT" &&
                          form.documentType === "LEASE"
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
                        {lease.unit.property.name} · Unit{" "}
                        {lease.unit.unitNumber}
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
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
                  onClick={() => void act("synchronize")}
                  disabled={working}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync
                </Button>
                {!terminalSignatureStatuses.includes(selected.status) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void act("remind")}
                      disabled={working}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Remind
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void act("cancel")}
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
                    onClick={() => void download(document.id)}
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
    </div>
  );
}
