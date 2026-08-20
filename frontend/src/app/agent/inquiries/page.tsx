"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCheck,
  Loader2,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  inquiryTime,
  type CursorPage,
  type ListingInquiry,
} from "@/lib/inquiries";

export default function AgentInquiriesPage() {
  const [items, setItems] = useState<ListingInquiry[]>([]);
  const [selected, setSelected] = useState<ListingInquiry | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const open = useCallback(async (id: string) => {
    try {
      const conversation = (await api.post(
        `/agent/inquiries/${id}/read`,
        {},
      )) as ListingInquiry;
      setSelected(conversation);
      setItems((current) =>
        current.map((item) => (item.id === id ? conversation : item)),
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open inquiry"));
    }
  }, []);

  useEffect(() => {
    api
      .get("/agent/inquiries")
      .then((page: CursorPage<ListingInquiry>) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        const requested = new URLSearchParams(window.location.search).get("id");
        const firstId =
          page.items.find((item) => item.id === requested)?.id ??
          page.items[0]?.id;
        if (firstId) void open(firstId);
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load inquiries")),
      )
      .finally(() => setLoading(false));
  }, [open]);

  const loadMoreInquiries = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = (await api.get(
        `/agent/inquiries?cursor=${encodeURIComponent(nextCursor)}`,
      )) as CursorPage<ListingInquiry>;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load more inquiries"));
    } finally {
      setLoadingMore(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selected?.nextMessageCursor) return;
    setLoadingOlder(true);
    try {
      const older = (await api.get(
        `/agent/inquiries/${selected.id}?cursor=${encodeURIComponent(selected.nextMessageCursor)}`,
      )) as ListingInquiry;
      setSelected((current) =>
        current
          ? {
              ...current,
              messages: [...older.messages, ...current.messages],
              nextMessageCursor: older.nextMessageCursor,
            }
          : current,
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load older messages"));
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    try {
      const updated = (await api.post(
        `/agent/inquiries/${selected.id}/messages`,
        { message: reply },
      )) as ListingInquiry;
      setSelected(updated);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setReply("");
      toast.success("Reply sent to the buyer");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send reply"));
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!selected) return;
    try {
      const updated = (await api.patch(
        `/agent/inquiries/${selected.id}/status`,
        {
          status: selected.status === "OPEN" ? "CLOSED" : "OPEN",
        },
      )) as ListingInquiry;
      setSelected(updated);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update inquiry"));
    }
  };

  if (loading)
    return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Buyer communication
        </p>
        <h1 className="mt-2 text-4xl font-bold font-heading">
          Listing inquiries
        </h1>
      </div>
      <div className="grid min-h-[650px] gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="overflow-hidden rounded-2xl">
          <CardContent className="divide-y p-0">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No buyer inquiries yet.
              </p>
            ) : (
              items.map((item) => {
                const unread = item.messages.some(
                  (message) =>
                    message.senderType === "BUYER" && !message.readAt,
                );
                return (
                  <button
                    key={item.id}
                    onClick={() => void open(item.id)}
                    className={`w-full p-5 text-left transition hover:bg-secondary ${selected?.id === item.id ? "bg-secondary" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong>{item.buyerName}</strong>
                      {unread && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {item.property.name}
                    </p>
                    <p className="mt-2 truncate text-xs">
                      {item.messages.at(-1)?.body}
                    </p>
                  </button>
                );
              })
            )}
            {nextCursor && (
              <div className="p-4">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => void loadMoreInquiries()}
                  disabled={loadingMore}
                >
                  {loadingMore && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Load more inquiries
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden rounded-2xl">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Building2 className="mr-2 h-5 w-5" />
              Select an inquiry
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{selected.buyerName}</h2>
                    <Badge variant="outline">{selected.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.property.name} · {selected.property.city},{" "}
                    {selected.property.state}
                  </p>
                  <p className="mt-2 text-xs">
                    <Mail className="mr-1 inline h-3 w-3" />
                    {selected.buyerEmail}
                    {selected.buyerPhone && (
                      <>
                        <Phone className="ml-3 mr-1 inline h-3 w-3" />
                        {selected.buyerPhone}
                      </>
                    )}
                  </p>
                </div>
                <Button variant="outline" onClick={() => void toggleStatus()}>
                  {selected.status === "OPEN"
                    ? "Close inquiry"
                    : "Reopen inquiry"}
                </Button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-6">
                {selected.nextMessageCursor && (
                  <div className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void loadOlderMessages()}
                      disabled={loadingOlder}
                    >
                      {loadingOlder && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Load earlier messages
                    </Button>
                  </div>
                )}
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === "AGENT" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl p-4 text-sm ${message.senderType === "AGENT" ? "bg-primary text-primary-foreground" : "border bg-card"}`}
                    >
                      <p>{message.body}</p>
                      <p className="mt-2 text-[10px] opacity-70">
                        {message.senderType === "AGENT"
                          ? "You"
                          : selected.buyerName}{" "}
                        · {inquiryTime(message.createdAt)}
                        {message.senderType === "AGENT" && (
                          <span>
                            {" "}
                            · <CheckCheck className="inline h-3 w-3" />{" "}
                            {message.readAt
                              ? `Seen ${inquiryTime(message.readAt)}`
                              : "Sent"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="flex gap-3 border-t p-5">
                <Textarea
                  className="min-h-12"
                  placeholder="Reply to the buyer…"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  required
                  maxLength={4000}
                  disabled={selected.status === "CLOSED"}
                />
                <Button
                  type="submit"
                  disabled={sending || selected.status === "CLOSED"}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
