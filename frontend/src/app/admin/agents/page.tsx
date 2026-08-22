"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Check,
  Download,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

type Agent = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  accountStatus: "PENDING" | "APPROVED" | "DECLINED" | "SUSPENDED";
  declineReason?: string | null;
  verificationDocuments: string[];
  createdAt: string;
  updatedAt: string;
};
type AgentStatus = Agent["accountStatus"];

async function openAgentDocument(agentId: string, index: number) {
  try {
    const result = (await api.get(
      `/agents/${agentId}/documents/${index}/url`,
    )) as { url: string };
    window.open(result.url, "_blank", "noopener,noreferrer");
  } catch (error: unknown) {
    toast.error(
      getErrorMessage(error, "Unable to open verification document"),
    );
  }
}

export default function AgentApprovalsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AgentStatus>("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAgents(await api.get(`/agents?status=${status}`));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load agent applications"));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    api
      .get(`/agents?status=${status}`)
      .then(setAgents)
      .catch((error: unknown) =>
        toast.error(
          getErrorMessage(error, "Unable to load agent applications"),
        ),
      )
      .finally(() => setLoading(false));
  }, [status]);

  const approve = async (id: string) => {
    setWorkingId(id);
    try {
      await api.patch(`/agents/${id}/approve`, {});
      toast.success("Agent approved");
      setAgents((items) => items.filter((agent) => agent.id !== id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to approve agent"));
    } finally {
      setWorkingId(null);
    }
  };

  const decline = async (id: string) => {
    const reason = reasons[id]?.trim();
    if (!reason || reason.length < 3) {
      toast.error("Add a clear decline reason");
      return;
    }
    setWorkingId(id);
    try {
      await api.patch(`/agents/${id}/decline`, { reason });
      toast.success("Agent declined");
      setAgents((items) => items.filter((agent) => agent.id !== id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to decline agent"));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Buy / Sell oversight
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Agent company directory
          </h1>
          <p className="mt-2 text-muted-foreground">
            Review applications and securely inspect company verification
            documents.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "DECLINED"] as AgentStatus[]).map((value) => (
          <Button
            key={value}
            variant={status === value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(value)}
          >
            {value.charAt(0) + value.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            No {status.toLowerCase()} agent companies.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {agents.map((agent) => (
            <Card key={agent.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle>{agent.companyName}</CardTitle>
                      <Badge variant="outline">{agent.accountStatus}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Submitted {new Date(agent.createdAt).toLocaleDateString()}
                      {agent.updatedAt !== agent.createdAt && (
                        <>
                          {" · "}Updated{" "}
                          {new Date(agent.updatedAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 rounded-xl bg-secondary/60 p-4 text-sm sm:grid-cols-2">
                  <span>
                    <strong>Contact</strong>
                    <br />
                    {agent.contactName}
                  </span>
                  <span>
                    <Mail className="mr-1 inline h-4 w-4" />
                    {agent.email}
                  </span>
                  {agent.phone && (
                    <span>
                      <Phone className="mr-1 inline h-4 w-4" />
                      {agent.phone}
                    </span>
                  )}
                </div>
                {agent.verificationDocuments.length ? (
                  <div className="flex flex-wrap gap-2">
                    {agent.verificationDocuments.map((documentPath, index) => (
                      <Button
                        key={documentPath}
                        variant="outline"
                        size="sm"
                              onClick={() =>
                                void openAgentDocument(agent.id, index)
                              }
                      >
                        <Download className="mr-2 h-4 w-4" /> Verification
                        document {index + 1}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-warning">
                    No verification documents uploaded.
                  </p>
                )}
                {agent.accountStatus === "DECLINED" && agent.declineReason && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
                    <strong>Decline reason:</strong> {agent.declineReason}
                  </div>
                )}
                {agent.accountStatus === "PENDING" && (
                  <>
                    <Input
                      placeholder="Decline reason (required only when declining)"
                      value={reasons[agent.id] || ""}
                      onChange={(e) =>
                        setReasons((current) => ({
                          ...current,
                          [agent.id]: e.target.value,
                        }))
                      }
                      maxLength={500}
                    />
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={() => approve(agent.id)}
                        disabled={workingId === agent.id}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={() => decline(agent.id)}
                        disabled={workingId === agent.id}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
