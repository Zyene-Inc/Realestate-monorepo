"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Send, User, Clock, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const messages = [
  {
    id: 1,
    sender: "Property Manager",
    body: "Hello, just confirming that the heating and cooling technician is on the way.",
    time: "10:30 AM",
    isMe: false,
  },
  {
    id: 2,
    sender: "Marcus Bell",
    body: "Great, thank you! I will be home to let them in.",
    time: "10:35 AM",
    isMe: true,
  },
  {
    id: 3,
    sender: "Property Manager",
    body: "Perfect. They should arrive within the next 30 minutes.",
    time: "10:40 AM",
    isMe: false,
  },
];

export default function TenantMessages() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col space-y-8 sm:space-y-10 lg:h-[calc(100dvh-5.5rem)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Messages
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Direct communication with Coach Johnson Realty.
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card shadow-sm rounded-[1.25rem] h-full">
          <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl font-heading shadow-md shadow-primary/20">
                M
              </div>
              <div>
                <h3 className="font-bold text-foreground tracking-tight text-lg font-heading">
                  Management Support
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="h-2 w-2 rounded-full bg-success"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-heading">
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto bg-background/50 p-4 sm:p-8">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.isMe ? "justify-end" : "justify-start",
                )}
              >
                <div className="flex max-w-[88%] flex-col gap-1.5 sm:max-w-[70%]">
                  <div
                    className={cn(
                      "p-5 shadow-sm font-medium leading-relaxed text-sm",
                      msg.isMe
                        ? "bg-primary text-primary-foreground rounded-[1.25rem] rounded-tr-sm shadow-primary/10"
                        : "bg-secondary text-foreground border border-border rounded-[1.25rem] rounded-tl-sm",
                    )}
                  >
                    <p>{msg.body}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading",
                      msg.isMe ? "text-right" : "text-left",
                    )}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-card p-3 sm:p-5">
            <div className="flex gap-3 bg-secondary/50 p-2 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-[background-color,color,border-color,box-shadow,transform,opacity]">
              <Input
                aria-label="Message property support"
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

        <div className="w-80 space-y-8 hidden lg:block overflow-y-auto pr-2">
          <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 rounded-xl border-border hover:bg-secondary text-xs font-bold uppercase tracking-widest h-12 font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity]"
              >
                <Clock className="w-4 h-4 text-muted-foreground" /> Message
                History
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 rounded-xl border-border hover:bg-secondary text-xs font-bold uppercase tracking-widest h-12 font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity]"
              >
                <User className="w-4 h-4 text-muted-foreground" /> Contact Info
              </Button>
            </CardContent>
          </Card>

          <div className="p-8 bg-primary rounded-[1.25rem]  text-primary-foreground relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-700">
              <Megaphone className="h-24 w-24 -mr-8 -mt-8" />
            </div>
            <h4 className="font-bold font-heading tracking-tight text-xl mb-4 relative z-10">
              Emergency Help?
            </h4>
            <p className="text-[10px] text-primary-foreground/80 font-medium uppercase tracking-[0.1em] leading-relaxed relative z-10">
              For immediate maintenance emergencies after hours, please call our
              24/7 hotline directly.
            </p>
            <a
              href="tel:+18165550147"
              className={buttonVariants({
                className: "relative z-10 mt-8 w-full",
              })}
            >
              Call hotline
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
