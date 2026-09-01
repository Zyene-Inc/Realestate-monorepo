"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Eye,
  Loader2,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors";
import { LeadNotesPanel } from "./_components/lead-notes-panel";
import { LeadWorkflowPanel } from "./_components/lead-workflow-panel";
import {
  getWebsiteLead,
  deleteWebsiteLead,
  leadTime,
  listWebsiteLeads,
  moveInDateLabel,
  websiteLeadIntentLabel,
  websiteLeadSourceLabel,
  websiteLeadStatusLabel,
  type WebsiteLeadDetail,
  type WebsiteLeadSummary,
} from "@/lib/website-leads";

export default function WebsiteLeadsPage() {
  const [items, setItems] = useState<WebsiteLeadSummary[]>([]);
  const [selected, setSelected] = useState<WebsiteLeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const open = async (id: string) => {
    try {
      setSelected(await getWebsiteLead(id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open website lead"));
    }
  };

  useEffect(() => {
    listWebsiteLeads()
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        if (page.items[0]) void open(page.items[0].id);
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load website leads")),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listWebsiteLeads(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load more leads"));
    } finally {
      setLoadingMore(false);
    }
  };

  const workflowUpdated = (updated: WebsiteLeadDetail) => {
    setSelected(updated);
    setItems((current) =>
      current.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      ),
    );
  };

  const deleteLead = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteWebsiteLead(selected.id);
      setItems((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      setDeleteDialogOpen(false);
      toast.success("Website lead deleted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to delete website lead"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Johnson Realty supervision
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Website leads
        </h1>
        <p className="mt-2 text-muted-foreground">
          Contact requests and assistant handoffs from the public website.
        </p>
      </div>
      <div className="grid min-h-[650px] gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden rounded-2xl">
          <CardContent className="divide-y p-0">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No website leads yet.
              </p>
            ) : (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => void open(item.id)}
                  className={`w-full p-5 text-left hover:bg-secondary ${selected?.id === item.id ? "bg-secondary" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate">
                      {item.name || item.email}
                    </strong>
                    <Badge variant="outline">
                      {websiteLeadStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {websiteLeadIntentLabel(item.intent)} · {item.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {leadTime(item.createdAt)}
                  </p>
                  {item.assignedTo ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Assigned to {item.assignedTo.email}
                    </p>
                  ) : null}
                </button>
              ))
            )}
            {nextCursor && (
              <div className="p-4">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Load more leads
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-2xl">
          {!selected ? (
            <div className="flex min-h-[600px] items-center justify-center text-muted-foreground">
              <Eye className="mr-2 h-5 w-5" />
              Select a lead
            </div>
          ) : (
            <div>
              <div className="border-b p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">
                    {selected.name || selected.email}
                  </h2>
                  <Badge>{websiteLeadStatusLabel(selected.status)}</Badge>
                </div>
                <p className="mt-2 text-xs">
                  <Mail className="mr-1 inline h-3 w-3" />
                  {selected.email}
                  {selected.phone && (
                    <>
                      <Phone className="ml-3 mr-1 inline h-3 w-3" />
                      {selected.phone}
                    </>
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {leadTime(selected.createdAt)} · Source{" "}
                  {websiteLeadSourceLabel(selected.source)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={deleting}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Delete lead
                  </Button>
                </div>
              </div>
              <div className="space-y-4 bg-secondary/20 p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Request
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {websiteLeadIntentLabel(selected.intent)}
                    </p>
                  </div>
                  {selected.moveInDate ? (
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        Preferred move-in
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {moveInDateLabel(selected.moveInDate)}
                      </p>
                    </div>
                  ) : null}
                </div>
                {selected.property ? (
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Building2 className="size-4" aria-hidden="true" />
                      Linked rental
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {selected.property.name}
                      {selected.unit
                        ? ` · Unit ${selected.unit.unitNumber}`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.property.address}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-2xl border bg-card p-4 text-sm leading-6">
                  {selected.message}
                </div>
                <LeadWorkflowPanel
                  key={`${selected.id}:${selected.updatedAt}`}
                  lead={selected}
                  onUpdated={workflowUpdated}
                />
                <LeadNotesPanel
                  key={selected.id}
                  leadId={selected.id}
                  initialCount={selected._count.notes}
                />
                {selected.conversation?.messages.length ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Recent chat context
                    </p>
                    {selected.conversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          message.role === "USER"
                            ? "border bg-card"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-2 text-[10px] opacity-70">
                          {message.role === "USER" ? "Visitor" : "Assistant"} ·{" "}
                          {leadTime(message.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this website lead?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected lead and its contact details
              from the portal. The deletion is recorded in the company audit
              log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteLead()}
            >
              {deleting ? <Loader2 className="animate-spin" /> : null}
              Delete lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
