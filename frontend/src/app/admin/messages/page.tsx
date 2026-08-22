"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Send, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const conversations = [
  {
    id: "1",
    tenant: "Marcus Bell",
    lastMessage: "When will the AC be fixed?",
    date: "10:30 AM",
    unread: true,
  },
  {
    id: "2",
    tenant: "Elena Torres",
    lastMessage: "Rent payment sent via ACH",
    date: "Yesterday",
    unread: false,
  },
  {
    id: "3",
    tenant: "Andre Lewis",
    lastMessage: "I received the invite, thanks!",
    date: "2 days ago",
    unread: false,
  },
];

export default function AdminMessages() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6 lg:h-[calc(100dvh-5.5rem)] lg:flex-row lg:gap-8">
      <div className="flex w-full flex-col gap-5 lg:w-80 lg:flex-shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Messages
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Tenant communications
          </p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            aria-label="Search conversations"
            className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium"
            placeholder="Search conversations"
          />
        </div>
        <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:max-h-none lg:flex-1 lg:grid-cols-1 lg:pr-2">
          {conversations.map((conv) => (
            <button
              type="button"
              key={conv.id}
              className={cn(
                "rounded-2xl border p-4 text-left transition-[background-color,border-color] duration-150",
                conv.unread
                  ? "bg-primary/5 border-primary/20 shadow-sm"
                  : "bg-card border-border hover:border-primary/30 hover:shadow-md",
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={cn(
                    "font-bold text-sm font-heading",
                    conv.unread ? "text-primary" : "text-foreground",
                  )}
                >
                  {conv.tenant}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-heading">
                  {conv.date}
                </span>
              </div>
              <p
                className={cn(
                  "text-[11px] truncate font-medium",
                  conv.unread
                    ? "text-foreground font-bold"
                    : "text-muted-foreground",
                )}
              >
                {conv.lastMessage}
              </p>
            </button>
          ))}
        </div>
      </div>

      <Card className="min-h-[35rem] min-w-0 flex-1 overflow-hidden border-border bg-card shadow-sm rounded-[1.25rem] lg:min-h-0">
        <div className="flex items-center gap-4 border-b border-border bg-secondary/30 p-4 sm:p-6">
          <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center border border-border">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground font-heading text-lg tracking-tight">
              Marcus Bell
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="h-2 w-2 rounded-full bg-success"
                aria-hidden="true"
              />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">
                Active tenant / Unit A1
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-background/50 p-4 sm:p-8">
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-[1.25rem] rounded-tl-sm border border-border bg-secondary p-4 text-sm font-medium leading-relaxed text-foreground shadow-sm sm:max-w-[70%]">
              Hello, the AC in my unit stopped working this morning. It is
              making a loud rattling noise.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-[1.25rem] rounded-tr-sm bg-primary p-4 text-sm font-medium leading-relaxed text-primary-foreground shadow-sm sm:max-w-[70%]">
              Hi Marcus, sorry to hear that. I have assigned Northline Heating
              and Cooling to inspect it. They should arrive by 2 PM today.
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-[1.25rem] rounded-tl-sm border border-border bg-secondary p-4 text-sm font-medium leading-relaxed text-foreground shadow-sm sm:max-w-[70%]">
              Great, thank you. I will be home.
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-card p-3 sm:p-5">
          <div className="flex gap-3 bg-secondary/50 p-2 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-[background-color,color,border-color,box-shadow,transform,opacity]">
            <Input
              aria-label="Message Marcus Bell"
              placeholder="Write a message"
              className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 h-14 text-sm font-medium placeholder:text-muted-foreground/60"
            />
            <Button
              aria-label="Send message"
              size="icon-lg"
              className="shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
