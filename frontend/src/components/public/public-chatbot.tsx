"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Send,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CHATBOT_LEAD_FORM_THRESHOLD,
  CHATBOT_LEAD_SUBMITTED_KEY,
  chatbotHistory,
  chatbotStatus,
  hasChatbotBookingIntent,
  isChatbotDailyLimitError,
  streamChatbotReply,
  submitWebsiteLead,
  type ChatbotMessage,
} from "@/lib/chatbot";
import { canonicalPortalForPath } from "@/lib/portal-paths";
import {
  isLocalOrPreviewHostname,
  portalForHostname,
} from "@/lib/portal-domains";
import { cn } from "@/lib/utils";

const suggestions = [
  "Show me homes for sale",
  "What rentals are available?",
  "How can I sell my property?",
];

function MessageContent({ content }: { content: string }) {
  const parts = content.split(
    /(https:\/\/coachjohnsonrealty\.com\/(?:properties|rentals)\/[^\s)]+)/g,
  );
  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {parts.map((part, index) =>
        /^https:\/\/coachjohnsonrealty\.com\/(?:properties|rentals)\//.test(
          part,
        ) ? (
          <a
            className="font-semibold text-primary underline underline-offset-4"
            href={part}
            key={`${part}-${index}`}
          >
            View property
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function publicChatAllowed(pathname: string) {
  if (canonicalPortalForPath(pathname)) return false;
  const hostname = window.location.hostname;
  const portal = portalForHostname(hostname);
  return portal === "public" || isLocalOrPreviewHostname(hostname);
}

function countUserMessages(messages: ChatbotMessage[]) {
  return messages.filter((message) => message.role === "USER").length;
}

function leadAlreadySubmitted() {
  try {
    return sessionStorage.getItem(CHATBOT_LEAD_SUBMITTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function PublicChatbot() {
  const pathname = usePathname();
  const publicRoute = canonicalPortalForPath(pathname) === null;
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(() => leadAlreadySubmitted());
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!publicChatAllowed(pathname)) return;
    const controller = new AbortController();
    void chatbotStatus(controller.signal)
      .then(async (status) => {
        if (!status.available) return;
        setAvailable(true);
        const history = await chatbotHistory(controller.signal);
        setMessages(history.items);
        if (
          !leadAlreadySubmitted() &&
          countUserMessages(history.items) >= CHATBOT_LEAD_FORM_THRESHOLD
        ) {
          setShowLeadForm(true);
        }
      })
      .catch(() => {
        setAvailable(false);
      });
    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, showLeadForm, leadSubmitted]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );

  function maybeShowLeadForm(message: string, currentMessages: ChatbotMessage[]) {
    if (leadSubmitted || leadAlreadySubmitted()) return;
    if (hasChatbotBookingIntent(message)) {
      setShowLeadForm(true);
      return;
    }
    if (countUserMessages(currentMessages) >= CHATBOT_LEAD_FORM_THRESHOLD) {
      setShowLeadForm(true);
    }
  }

  if (!publicRoute || !available) return null;

  async function sendMessage(message: string) {
    const value = message.trim();
    if (!value || busy || activeRequest.current) return;
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const nextMessages: ChatbotMessage[] = [
      ...messages,
      { id: userId, role: "USER", content: value, createdAt: now },
      {
        id: assistantId,
        role: "ASSISTANT",
        content: "",
        createdAt: now,
      },
    ];
    setMessages(nextMessages);
    maybeShowLeadForm(value, nextMessages);
    setInput("");
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    activeRequest.current = controller;

    try {
      await streamChatbotReply({
        message: value,
        signal: controller.signal,
        onDelta: (text) => {
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? { ...item, content: item.content + text }
                : item,
            ),
          );
        },
      });
    } catch (caught) {
      if (!controller.signal.aborted) {
        const messageText =
          caught instanceof Error
            ? caught.message
            : "The assistant is temporarily unavailable.";
        setError(messageText);
        if (isChatbotDailyLimitError(messageText)) {
          setShowLeadForm(true);
        }
        setMessages((current) =>
          current.filter(
            (item) => item.id !== assistantId || item.content.length > 0,
          ),
        );
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setBusy(false);
    }
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (leadBusy || leadSubmitted) return;
    setLeadError(null);
    setLeadBusy(true);
    try {
      await submitWebsiteLead({
        email: leadEmail.trim(),
        phone: leadPhone.trim() || undefined,
        message: leadMessage.trim(),
        website: "",
      });
      try {
        sessionStorage.setItem(CHATBOT_LEAD_SUBMITTED_KEY, "1");
      } catch {
        // sessionStorage may be unavailable in restricted contexts.
      }
      setLeadSubmitted(true);
      setShowLeadForm(false);
      const now = new Date().toISOString();
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "ASSISTANT",
          content:
            "Thanks — your message is with our sales team. Someone from Johnson Realty will follow up soon.",
          createdAt: now,
        },
      ]);
    } catch (caught) {
      setLeadError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit your request.",
      );
    } finally {
      setLeadBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            aria-label="Open Coach Johnson Realty AI assistant"
            className="fixed bottom-4 right-4 z-40 size-14 rounded-full shadow-xl sm:bottom-6 sm:right-6"
            size="icon-lg"
          />
        }
      >
        <MessageCircle className="size-6" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="inset-auto bottom-2 left-2 right-2 top-auto max-h-[calc(100dvh-1rem)] w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden p-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[25rem] sm:max-w-[calc(100vw-3rem)]">
        <DialogHeader className="border-b bg-brand px-5 py-4 pr-12 text-white">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/12">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-white">
                Property assistant
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/70">
                AI help for listings and Johnson Realty services
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          aria-live="polite"
          className="min-h-64 flex-1 space-y-4 overflow-y-auto bg-background px-4 py-5 sm:max-h-[28rem]"
        >
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="size-3.5" aria-hidden="true" />
            </span>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5">
              <p className="text-sm leading-6">
                Hi, I’m Johnson Realty’s AI assistant. I can help you explore
                public listings or explain how our services work. I can’t answer
                general questions outside Coach Johnson Realty.
              </p>
            </div>
          </div>

          {messages.length === 0 && (
            <div className="grid gap-2 pl-9">
              {suggestions.map((suggestion) => (
                <button
                  className="focus-ring rounded-xl border bg-card px-3 py-2 text-left text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-secondary"
                  key={suggestion}
                  onClick={() => void sendMessage(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {messages.map((message) => {
            const visitor = message.role === "USER";
            return (
              <div
                className={cn("flex gap-2.5", visitor && "flex-row-reverse")}
                key={message.id}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    visitor
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {visitor ? (
                    <UserRound className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Bot className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                    visitor
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm border bg-card",
                  )}
                >
                  {message.content ? (
                    <MessageContent content={message.content} />
                  ) : (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Thinking…
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {error && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {error} Use our{" "}
              <Link className="font-semibold underline" href="/contact">
                contact form
              </Link>{" "}
              for human help.
            </div>
          )}
          {showLeadForm && !leadSubmitted && (
            <form
              className="rounded-2xl border bg-card p-4 shadow-sm"
              onSubmit={(event) => void submitLead(event)}
            >
              <p className="text-sm font-semibold">
                Book a conversation with Johnson Realty
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share your contact details and our sales team will follow up.
              </p>
              <div className="mt-3 space-y-2">
                <Input
                  aria-label="Email"
                  autoComplete="email"
                  disabled={leadBusy}
                  onChange={(event) => setLeadEmail(event.target.value)}
                  placeholder="Email"
                  required
                  type="email"
                  value={leadEmail}
                />
                <Input
                  aria-label="Phone"
                  autoComplete="tel"
                  disabled={leadBusy}
                  onChange={(event) => setLeadPhone(event.target.value)}
                  placeholder="Phone (optional)"
                  type="tel"
                  value={leadPhone}
                />
                <Textarea
                  aria-label="Message"
                  className="min-h-20 resize-none text-sm"
                  disabled={leadBusy}
                  maxLength={4000}
                  onChange={(event) => setLeadMessage(event.target.value)}
                  placeholder="What would you like to discuss?"
                  required
                  rows={3}
                  value={leadMessage}
                />
                <input
                  aria-hidden="true"
                  className="hidden"
                  name="website"
                  tabIndex={-1}
                  type="text"
                  value=""
                  readOnly
                />
              </div>
              {leadError && (
                <p className="mt-2 text-xs text-destructive">{leadError}</p>
              )}
              <Button
                className="mt-3 w-full"
                disabled={
                  leadBusy ||
                  leadEmail.trim().length === 0 ||
                  leadMessage.trim().length < 5
                }
                type="submit"
              >
                {leadBusy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  "Send to Johnson Realty"
                )}
              </Button>
            </form>
          )}
          <div ref={messageEnd} />
        </div>

        <form className="border-t bg-card p-3" onSubmit={submit}>
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Message the property assistant"
              className="max-h-28 min-h-11 resize-none py-2.5 text-sm"
              disabled={busy}
              maxLength={1000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a property or service…"
              rows={1}
              value={input}
            />
            <Button
              aria-label="Send message"
              className="size-11 shrink-0"
              disabled={busy || input.trim().length === 0}
              size="icon"
              type="submit"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
            Coach Johnson Realty topics only. AI can make mistakes. Don’t share
            financial or identity details. Chats expire after 30 days. For
            decisions, speak with a licensed professional.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
