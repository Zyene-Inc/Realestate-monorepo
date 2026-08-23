"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCheck, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { inquiryTime, type ListingInquiry } from "@/lib/inquiries";

type StoredAccess = { inquiryId: string; expiresAt: string };

export function BuyerInquiryPanel({ listingId }: { listingId: string }) {
  const storageKey = `johnson-realty-inquiry-${listingId}`;
  const [inquiry, setInquiry] = useState<ListingInquiry | null>(null);
  const accessRef = useRef<StoredAccess | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as StoredAccess;
      if (new Date(saved.expiresAt) <= new Date()) {
        localStorage.removeItem(storageKey);
        return;
      }
      api
        .post(`/public/inquiries/${saved.inquiryId}/access`, {})
        .then((value: ListingInquiry) => {
          accessRef.current = saved;
          setInquiry(value);
        })
        .catch(() => localStorage.removeItem(storageKey));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const loadOlderMessages = async () => {
    const access = accessRef.current;
    if (!inquiry?.nextMessageCursor || !access) return;
    setLoadingOlder(true);
    try {
      const older = (await api.post(`/public/inquiries/${inquiry.id}/access`, {
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
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const access = accessRef.current;
      if (inquiry && access) {
        const updated = (await api.post(
          `/public/inquiries/${inquiry.id}/messages`,
          { message },
        )) as ListingInquiry;
        setInquiry(updated);
        setMessage("");
        toast.success("Reply sent to the listing agent");
      } else {
        const created = (await api.post(
          `/public/sale-listings/${listingId}/inquiries`,
          { buyerName, buyerEmail, buyerPhone, message, website: "" },
        )) as { inquiry: ListingInquiry; expiresAt: string };
        const saved = {
          inquiryId: created.inquiry.id,
          expiresAt: created.expiresAt,
        };
        localStorage.setItem(storageKey, JSON.stringify(saved));
        accessRef.current = saved;
        setInquiry(created.inquiry);
        setMessage("");
        toast.success("Inquiry sent to the listing agent");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send inquiry"));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-6">
      <div className="flex items-center gap-2 font-semibold">
        <MessageSquare className="size-4 text-primary" aria-hidden="true" /> Ask about this home
      </div>
      {inquiry && (
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl bg-secondary/70 p-3" aria-label="Conversation with the listing agent" aria-live="polite">
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
                  : "mr-8 rounded-xl border border-border bg-card p-3 text-sm"
              }
            >
              <p>{item.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {item.senderType === "BUYER"
                  ? "You"
                  : inquiry.agent.contactName}{" "}
                <span aria-hidden="true"> / </span>{inquiryTime(item.createdAt)}
                {item.senderType === "BUYER" && (
                  <span>
                    <span aria-hidden="true"> / </span><CheckCheck className="inline size-3" aria-hidden="true" />{" "}
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
              <Label htmlFor="buyer-name">Name</Label>
              <Input
                id="buyer-name"
                name="name"
                autoComplete="name"
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <Label htmlFor="buyer-email">Email</Label>
              <Input
                id="buyer-email"
                name="email"
                type="email"
                autoComplete="email"
                value={buyerEmail}
                onChange={(event) => setBuyerEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="buyer-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                id="buyer-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={buyerPhone}
                onChange={(event) => setBuyerPhone(event.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="buyer-message">{inquiry ? "Reply" : "Message"}</Label>
          <Textarea
            id="buyer-message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            minLength={inquiry ? 1 : 5}
            maxLength={4000}
            disabled={inquiry?.status === "CLOSED"}
            placeholder={inquiry ? "Write a reply" : "Ask about availability, showings, or property details"}
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
