"use client";

import { useEffect, useState } from "react";
import { CheckCheck, Eye, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  inquiryTime,
  type CursorPage,
  type ListingInquiry,
} from "@/lib/inquiries";

export default function InquiryOversightPage() {
  const [items, setItems] = useState<ListingInquiry[]>([]);
  const [selected, setSelected] = useState<ListingInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const open = async (id: string) => {
    try {
      setSelected(await api.get(`/admin/inquiries/${id}`));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open inquiry"));
    }
  };

  useEffect(() => {
    api
      .get("/admin/inquiries")
      .then((page: CursorPage<ListingInquiry>) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        if (page.items[0]) void open(page.items[0].id);
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load inquiry oversight")),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadMoreInquiries = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = (await api.get(
        `/admin/inquiries?cursor=${encodeURIComponent(nextCursor)}`,
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
        `/admin/inquiries/${selected.id}?cursor=${encodeURIComponent(selected.nextMessageCursor)}`,
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

  if (loading)
    return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Johnson Realty supervision
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Buyer inquiry oversight
        </h1>
        <p className="mt-2 text-muted-foreground">
          Read-only visibility across agent conversations.
        </p>
      </div>
      <div className="grid min-h-[650px] gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden rounded-2xl">
          <CardContent className="divide-y p-0">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No buyer inquiries yet.
              </p>
            ) : (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => void open(item.id)}
                  className={`w-full p-5 text-left hover:bg-secondary ${selected?.id === item.id ? "bg-secondary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <strong>{item.buyerName}</strong>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm">{item.property.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.agent.companyName}
                  </p>
                </button>
              ))
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
        <Card className="overflow-hidden rounded-2xl">
          {!selected ? (
            <div className="flex min-h-[600px] items-center justify-center text-muted-foreground">
              <Eye className="mr-2 h-5 w-5" />
              Select a conversation
            </div>
          ) : (
            <div>
              <div className="border-b p-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{selected.buyerName}</h2>
                  <Badge>{selected.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.property.name} · Routed to{" "}
                  {selected.agent.contactName}, {selected.agent.companyName}
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
              <div className="space-y-4 bg-secondary/20 p-6">
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
                          ? selected.agent.contactName
                          : selected.buyerName}{" "}
                        · {inquiryTime(message.createdAt)}
                        <span>
                          {" "}
                          · <CheckCheck className="inline h-3 w-3" />{" "}
                          {message.readAt
                            ? `Seen ${inquiryTime(message.readAt)}`
                            : "Sent"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
