"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCheck, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { inquiryTime, type ListingInquiry } from "@/lib/inquiries";

type StoredAccess = { inquiryId: string; accessToken: string };

export function BuyerInquiryPanel({ listingId }: { listingId: string }) {
  const storageKey = `johnson-realty-inquiry-${listingId}`;
  const [inquiry, setInquiry] = useState<ListingInquiry | null>(null);
  const [access, setAccess] = useState<StoredAccess | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as StoredAccess;
      api
        .post(`/public/inquiries/${saved.inquiryId}/access`, {
          accessToken: saved.accessToken,
        })
        .then((value: ListingInquiry) => {
          setAccess(saved);
          setInquiry(value);
        })
        .catch(() => localStorage.removeItem(storageKey));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const loadOlderMessages = async () => {
    if (!inquiry?.nextMessageCursor || !access) return;
    setLoadingOlder(true);
    try {
      const older = (await api.post(`/public/inquiries/${inquiry.id}/access`, {
        accessToken: access.accessToken,
        cursor: inquiry.nextMessageCursor,
      })) as ListingInquiry;
      setInquiry((current) =>
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      if (inquiry && access) {
        const updated = (await api.post(
          `/public/inquiries/${inquiry.id}/messages`,
          { accessToken: access.accessToken, message },
        )) as ListingInquiry;
        setInquiry(updated);
        setMessage("");
        toast.success("Reply sent to the listing agent");
      } else {
        const created = (await api.post(
          `/public/sale-listings/${listingId}/inquiries`,
          { buyerName, buyerEmail, buyerPhone, message, website: "" },
        )) as { inquiry: ListingInquiry; accessToken: string };
        const saved = {
          inquiryId: created.inquiry.id,
          accessToken: created.accessToken,
        };
        localStorage.setItem(storageKey, JSON.stringify(saved));
        setAccess(saved);
        setInquiry(created.inquiry);
        setMessage("");
        toast.success("Inquiry sent to the listing agent");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send inquiry"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 border-t pt-5">
      <div className="flex items-center gap-2 font-semibold">
        <MessageSquare className="h-4 w-4" /> Ask about this home
      </div>
      {inquiry && (
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl bg-secondary/50 p-3">
          {inquiry.nextMessageCursor && (
            <div className="text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadOlderMessages()}
                disabled={loadingOlder}
              >
                {loadingOlder && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Load earlier messages
              </Button>
            </div>
          )}
          {inquiry.messages.map((item) => (
            <div
              key={item.id}
              className={
                item.senderType === "BUYER"
                  ? "ml-8 rounded-xl bg-primary p-3 text-sm text-primary-foreground"
                  : "mr-8 rounded-xl border bg-card p-3 text-sm"
              }
            >
              <p>{item.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {item.senderType === "BUYER"
                  ? "You"
                  : inquiry.agent.contactName}{" "}
                · {inquiryTime(item.createdAt)}
                {item.senderType === "BUYER" && (
                  <span>
                    {" "}
                    · <CheckCheck className="inline h-3 w-3" />{" "}
                    {item.readAt ? `Seen ${inquiryTime(item.readAt)}` : "Sent"}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        {!inquiry && (
          <>
            <div>
              <Label>Name</Label>
              <Input
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={buyerEmail}
                onChange={(event) => setBuyerEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                value={buyerPhone}
                onChange={(event) => setBuyerPhone(event.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <Label>{inquiry ? "Reply" : "Message"}</Label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            minLength={inquiry ? 1 : 5}
            maxLength={4000}
            disabled={inquiry?.status === "CLOSED"}
          />
        </div>
        <Button
          className="w-full"
          type="submit"
          disabled={sending || inquiry?.status === "CLOSED"}
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {inquiry ? "Send reply" : "Send inquiry"}
        </Button>
        {inquiry?.status === "CLOSED" && (
          <p className="text-xs text-muted-foreground">
            This conversation was closed by the listing agent.
          </p>
        )}
      </form>
    </div>
  );
}
