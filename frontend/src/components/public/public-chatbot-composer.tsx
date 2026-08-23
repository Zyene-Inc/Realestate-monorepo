import type { FormEventHandler, KeyboardEventHandler } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PublicChatbotComposerProps = {
  busy: boolean;
  chatPausedForBooking: boolean;
  input: string;
  onChange: (value: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function PublicChatbotComposer({
  busy,
  chatPausedForBooking,
  input,
  onChange,
  onKeyDown,
  onSubmit,
}: PublicChatbotComposerProps) {
  return (
    <form className="border-t bg-card p-2.5" onSubmit={onSubmit}>
      <div className="flex items-end gap-2">
        <Textarea
          aria-describedby={
            chatPausedForBooking ? "chat-booking-required" : undefined
          }
          aria-label="Message the property assistant"
          className="max-h-24 min-h-11 resize-none py-2.5 text-sm"
          disabled={busy || chatPausedForBooking}
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            chatPausedForBooking
              ? "Complete the booking form to continue"
              : "Ask about a property or service…"
          }
          rows={1}
          value={input}
        />
        <Button
          aria-label="Send message"
          className="size-11 shrink-0"
          disabled={busy || chatPausedForBooking || input.trim().length === 0}
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
      {chatPausedForBooking && (
        <p
          className="mt-1.5 text-xs font-medium text-muted-foreground"
          id="chat-booking-required"
        >
          Complete the booking form above to continue chatting.
        </p>
      )}
      <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
        Coach Johnson Realty topics only. AI can make mistakes. Don’t share
        financial or identity details. Chats expire after 30 days. For
        decisions, speak with a licensed professional.
      </p>
    </form>
  );
}
