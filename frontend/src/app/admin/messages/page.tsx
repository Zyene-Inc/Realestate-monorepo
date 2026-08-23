"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { role: string; email: string };
};
type Conversation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessage: Message | null;
  unit: { unitNumber: string; property: { name: string } } | null;
};
type InboxPage = { items: Conversation[]; nextCursor: string | null };
type ThreadPage = {
  tenant: Conversation;
  items: Message[];
  nextCursor: string | null;
};

export default function AdminMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");

  const loadInbox = async () => {
    const page = (await api.get("/admin/messages")) as InboxPage;
    setConversations(page.items);
    return page.items;
  };

  const openThread = async (tenantId: string) => {
    setSelectedId(tenantId);
    try {
      const page = (await api.get(`/admin/messages/${tenantId}`)) as ThreadPage;
      setThread(page);
      await api.post(`/admin/messages/${tenantId}/read`, {});
      await loadInbox();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open conversation"));
    }
  };

  useEffect(() => {
    api
      .get("/admin/messages")
      .then(async (page: InboxPage) => {
        setConversations(page.items);
        const first = page.items[0];
        if (first) {
          setSelectedId(first.id);
          const firstThread = (await api.get(
            `/admin/messages/${first.id}`,
          )) as ThreadPage;
          setThread(firstThread);
          await api.post(`/admin/messages/${first.id}/read`, {});
        }
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load tenant messages")),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.firstName} ${conversation.lastName} ${conversation.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [conversations, query]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (sendingRef.current || !selectedId || !body.trim()) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const updated = (await api.post(`/admin/messages/${selectedId}`, {
        body,
      })) as ThreadPage;
      setThread(updated);
      setBody("");
      await loadInbox();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send message"));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const loadOlder = async () => {
    if (!selectedId || !thread?.nextCursor) return;
    try {
      const older = (await api.get(
        `/admin/messages/${selectedId}?cursor=${encodeURIComponent(thread.nextCursor)}`,
      )) as ThreadPage;
      setThread({
        ...older,
        items: [...older.items, ...thread.items],
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load older messages"));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-primary">Rental operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Tenant inbox
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every resident message routes directly into this shared Rental Admin
          inbox.
        </p>
      </div>
      <div className="grid min-h-[42rem] gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search tenant conversations"
              className="pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search residents"
            />
          </div>
          <div className="grid max-h-[36rem] gap-2 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">
                No tenant conversations yet.
              </p>
            ) : null}
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void openThread(conversation.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  selectedId === conversation.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <strong className="truncate text-sm">
                    {conversation.firstName} {conversation.lastName}
                  </strong>
                  {conversation.unreadCount > 0 ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block truncate text-xs text-muted-foreground">
                  {conversation.lastMessage?.body}
                </span>
                <span className="mt-2 block text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                    addSuffix: true,
                  })}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <Card className="flex min-h-[38rem] min-w-0 flex-col overflow-hidden">
          {thread ? (
            <>
              <header className="border-b border-border p-5">
                <h2 className="font-semibold">
                  {thread.tenant.firstName} {thread.tenant.lastName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {thread.tenant.unit
                    ? `${thread.tenant.unit.property.name} · Unit ${thread.tenant.unit.unitNumber}`
                    : "No current unit"}
                </p>
              </header>
              <div
                className="flex-1 space-y-5 overflow-y-auto bg-secondary/20 p-5"
                aria-live="polite"
              >
                {thread.nextCursor ? (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadOlder()}
                    >
                      Load older messages
                    </Button>
                  </div>
                ) : null}
                {thread.items.map((message) => {
                  const fromAdmin = message.sender.role !== "TENANT";
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        fromAdmin ? "justify-end" : "justify-start",
                      )}
                    >
                      <div className="max-w-[82%]">
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm leading-6",
                            fromAdmin
                              ? "rounded-tr-sm bg-primary text-primary-foreground"
                              : "rounded-tl-sm border border-border bg-card",
                          )}
                        >
                          {message.body}
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-[11px] text-muted-foreground",
                            fromAdmin && "text-right",
                          )}
                        >
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                          {fromAdmin
                            ? ` · ${message.readAt ? "Seen" : "Sent"}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={send}
                className="flex gap-3 border-t border-border p-4"
              >
                <Input
                  aria-label={`Message ${thread.tenant.firstName}`}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write a reply"
                  maxLength={4000}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || !body.trim()}
                  aria-label="Send reply"
                >
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="size-10 text-primary" />
              <h2 className="mt-4 text-xl font-semibold">
                Select a conversation
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Resident messages will appear here.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
