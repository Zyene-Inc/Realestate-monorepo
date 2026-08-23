"use client";

import { format } from "date-fns";
import { CheckCircle2, History, Loader2, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditEvent } from "@/lib/reports";

function displayAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase();
}

function eventValue(value: unknown) {
  if (value == null) return "No value";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function AuditTimeline({
  events,
  cursor,
  actionFilter,
  resourceFilter,
  loadingMore,
  onActionFilter,
  onResourceFilter,
  onApply,
  onLoadMore,
}: {
  events: AuditEvent[];
  cursor: string | null;
  actionFilter: string;
  resourceFilter: string;
  loadingMore: boolean;
  onActionFilter: (value: string) => void;
  onResourceFilter: (value: string) => void;
  onApply: () => void;
  onLoadMore: () => Promise<void>;
}) {
  return (
    <Card className="rounded-2xl" id="audit-history">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" /> Compliance history
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Chronological, read-only events across authentication, sales,
              rentals, communications, email, and e-signatures.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="audit-action">Exact action</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="audit-action"
                  value={actionFilter}
                  onChange={(event) => onActionFilter(event.target.value)}
                  placeholder="PAYMENT_RECORDED"
                  className="w-56 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-resource">Exact resource</Label>
              <Input
                id="audit-resource"
                value={resourceFilter}
                onChange={(event) => onResourceFilter(event.target.value)}
                placeholder="payment"
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={onApply}>
              <Search /> Apply filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {events.length ? (
          <ol className="space-y-0 border-l border-border pl-6">
            {events.map((event) => (
              <li key={event.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[1.79rem] top-1.5 flex size-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {displayAction(event.action)}
                  </Badge>
                  <Badge variant="secondary">{event.resource}</Badge>
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-medium">
                    {event.user?.email || "System / provider"}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}· {format(new Date(event.createdAt), "MMM d, yyyy, h:mm a")}
                  </span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {event.resourceId || "No resource ID"}
                </p>
                {(event.oldValue != null || event.newValue != null) && (
                  <details className="mt-3 rounded-xl border bg-muted/30 p-3 text-xs">
                    <summary className="cursor-pointer font-medium">
                      Review before and after values
                    </summary>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="mb-1 font-semibold">Before</p>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3">
                          {eventValue(event.oldValue)}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 font-semibold">After</p>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3">
                          {eventValue(event.newValue)}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-col items-center py-14 text-center">
            <CheckCircle2 className="size-8 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No matching audit events</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust the dates or exact filters.
            </p>
          </div>
        )}
        {cursor && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={() => void onLoadMore()}
            >
              {loadingMore ? <Loader2 className="animate-spin" /> : <History />}
              Load more events
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
