import { Bot, House, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublicChatbotWelcomeProps = {
  onDismiss: () => void;
  onSelect: (message: string) => void;
};

export function PublicChatbotWelcome({
  onDismiss,
  onSelect,
}: PublicChatbotWelcomeProps) {
  return (
    <aside
      aria-label="Property assistant welcome"
      className="fixed bottom-20 right-4 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-[20px] border bg-card p-4 shadow-[0_16px_36px_oklch(0.1_0.02_150/0.16)] sm:bottom-24 sm:right-6"
    >
      <Button
        aria-label="Dismiss property assistant welcome"
        className="absolute right-2 top-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={onDismiss}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
      <div className="flex gap-3 pr-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Hi, what are you looking for?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            I can help you find a home or explore available rentals.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          className="justify-start"
          onClick={() => onSelect("Show me homes for sale")}
          type="button"
          variant="outline"
        >
          <House className="size-4" aria-hidden="true" />
          Properties
        </Button>
        <Button
          className="justify-start"
          onClick={() => onSelect("What rentals are available?")}
          type="button"
          variant="outline"
        >
          <House className="size-4" aria-hidden="true" />
          Rentals
        </Button>
      </div>
    </aside>
  );
}
