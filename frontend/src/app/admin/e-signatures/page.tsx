"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSignature, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  documentTypeLabel,
  signatureStatusLabel,
  type CursorPage,
  type ESignatureEnvelope,
  type ESignatureEvent,
} from "@/lib/e-signatures";
import { getErrorMessage } from "@/lib/errors";
import {
  ESignatureCreateDialog,
  ESignatureDetailsDialog,
  type ESignatureAgent,
  type ESignatureForm,
  type ESignatureLease,
  type ESignatureTemplate,
  type ESignatureTenant,
} from "./_components/e-signature-dialogs";

type Configuration = {
  enabled: boolean;
  apiConfigured: boolean;
  webhookConfigured: boolean;
  plan: string;
};

const emptyForm: ESignatureForm = {
  templateId: "",
  documentType: "LEASE",
  targetType: "TENANT",
  targetId: "",
  leaseId: "",
  title: "",
};

export default function AdminESignaturesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ESignatureEnvelope[]>([]);
  const [templates, setTemplates] = useState<ESignatureTemplate[]>([]);
  const [tenants, setTenants] = useState<ESignatureTenant[]>([]);
  const [agents, setAgents] = useState<ESignatureAgent[]>([]);
  const [leases, setLeases] = useState<ESignatureLease[]>([]);
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null,
  );
  const [form, setForm] = useState<ESignatureForm>(emptyForm);
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
    if (!selectedRole) {
      toast.error("Select a template with one signer role");
      return;
    }
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
      const updated: ESignatureEnvelope = await api.post(
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

      <ESignatureCreateDialog
        open={createOpen}
        setOpen={setCreateOpen}
        form={form}
        setForm={setForm}
        templates={templates}
        targetOptions={targetOptions}
        eligibleLeases={eligibleLeases}
        role={user?.role}
        selectedRole={selectedRole}
        working={working}
        onSubmit={createEnvelope}
      />
      <ESignatureDetailsDialog
        selected={selected}
        events={events}
        working={working}
        onClose={() => setSelected(null)}
        onAction={act}
        onDownload={download}
      />
    </div>
  );
}
