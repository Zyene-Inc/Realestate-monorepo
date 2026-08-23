"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare, Send } from "lucide-react";
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
  sender: { role: string };
};
type ThreadPage = {
  tenant: {
    firstName: string;
    unit: { unitNumber: string; property: { name: string } } | null;
  };
  items: Message[];
  nextCursor: string | null;
};

export default function TenantMessages() {
  const [thread, setThread] = useState<ThreadPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [body, setBody] = useState("");

  useEffect(() => {
    api
      .get("/tenant/portal/messages")
      .then(async (page: ThreadPage) => {
        setThread(page);
        await api.post("/tenant/portal/messages/read", {});
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load messages")),
      )
      .finally(() => setLoading(false));
  }, []);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (sendingRef.current || !body.trim()) return;
    sendingRef.current = true;
    setSending(true);
    try {
      setThread(
        (await api.post("/tenant/portal/messages", { body })) as ThreadPage,
      );
      setBody("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send message"));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const loadOlder = async () => {
    if (!thread?.nextCursor) return;
    try {
      const older = (await api.get(
        `/tenant/portal/messages?cursor=${encodeURIComponent(thread.nextCursor)}`,
      )) as ThreadPage;
      setThread({ ...older, items: [...older.items, ...thread.items] });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load older messages"));
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-primary">Resident support</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Messages
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Write directly to the Coach Johnson Realty rental team.
        </p>
      </div>
      <Card className="flex min-h-[42rem] flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border p-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageSquare />
          </span>
          <div>
            <h2 className="font-semibold">Rental management</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {thread?.tenant.unit
                ? `${thread.tenant.unit.property.name} · Unit ${thread.tenant.unit.unitNumber}`
                : "Coach Johnson Realty support"}
            </p>
          </div>
        </header>
        <div
          className="flex-1 space-y-5 overflow-y-auto bg-secondary/20 p-5"
          aria-live="polite"
        >
          {thread?.nextCursor ? (
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
          {thread?.items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-semibold">Start a conversation</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Questions about your home, lease, or account all route to Rental
                Admin.
              </p>
            </div>
          ) : null}
          {thread?.items.map((message) => {
            const fromTenant = message.sender.role === "TENANT";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  fromTenant ? "justify-end" : "justify-start",
                )}
              >
                <div className="max-w-[82%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-6",
                      fromTenant
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm border border-border bg-card",
                    )}
                  >
                    {message.body}
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[11px] text-muted-foreground",
                      fromTenant && "text-right",
                    )}
                  >
                    {formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true,
                    })}
                    {fromTenant ? ` · ${message.readAt ? "Seen" : "Sent"}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex gap-3 border-t border-border p-4">
          <Input
            aria-label="Message rental management"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a message"
            maxLength={4000}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !body.trim()}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
