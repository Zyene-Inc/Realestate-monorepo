"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  templateKey: string;
  templateVersion: number;
  status: string;
  critical: boolean;
  resendEmailId: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
};

type EmailPage = { items: EmailLog[]; nextCursor: string | null };

const success = new Set(["SENT", "DELIVERED", "OPENED", "CLICKED"]);
const failure = new Set(["FAILED", "BOUNCED", "COMPLAINED", "SUPPRESSED"]);
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function date(value: string | null) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

export default function AdminEmailDeliveryPage() {
  const [items, setItems] = useState<EmailLog[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async (nextCursor?: string) => {
    const page = (await api.get(
      `/admin/emails?limit=25${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""}`,
    )) as EmailPage;
    setItems((current) => (nextCursor ? [...current, ...page.items] : page.items));
    setCursor(page.nextCursor);
  }, []);

  useEffect(() => {
    api
      .get("/admin/emails?limit=25")
      .then((data) => {
        const page = data as EmailPage;
        setItems(page.items);
        setCursor(page.nextCursor);
      })
      .catch((error) => toast.error(getErrorMessage(error, "Unable to load email delivery")))
      .finally(() => setLoading(false));
  }, []);

  async function retry(id: string) {
    setRetrying(id);
    try {
      await api.post(`/admin/emails/${id}/retry`, {});
      await load();
      toast.success("Email retry processed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to retry email"));
    } finally {
      setRetrying(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" aria-label="Loading email delivery" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Company administration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Email delivery</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Resend acceptance, delivery, opens, failures, and bounded retry attempts. Message bodies and secure links are intentionally excluded.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw aria-hidden="true" />Refresh</Button>
      </header>

      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center"><MailCheck className="size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">No email events yet</h2><p className="mt-2 text-sm text-muted-foreground">New transactional messages will appear here.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const canRetry = failure.has(item.status) || item.status === "RETRY_PENDING";
            return (
              <Card key={item.id}>
                <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={failure.has(item.status) ? "destructive" : success.has(item.status) ? "default" : "secondary"}>{item.status.replaceAll("_", " ")}</Badge>
                      {item.critical ? <Badge variant="outline">Critical</Badge> : null}
                      <span className="text-xs text-muted-foreground">v{item.templateVersion}</span>
                    </div>
                    <h2 className="mt-3 truncate font-semibold">{item.subject}</h2>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{item.to}</p>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{item.templateKey}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">Created</dt><dd>{date(item.createdAt)}</dd>
                    <dt className="text-muted-foreground">Delivered</dt><dd>{date(item.deliveredAt)}</dd>
                    <dt className="text-muted-foreground">Opened</dt><dd>{date(item.openedAt)}</dd>
                    <dt className="text-muted-foreground">Attempts</dt><dd>{item.attemptCount} / {item.maxAttempts}</dd>
                    {item.nextRetryAt ? <><dt className="text-muted-foreground">Next retry</dt><dd>{date(item.nextRetryAt)}</dd></> : null}
                  </dl>
                  <div className="lg:text-right">
                    {canRetry ? <Button size="sm" variant="outline" disabled={retrying === item.id} onClick={() => void retry(item.id)}>{retrying === item.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}Retry</Button> : success.has(item.status) ? <CheckCircle2 className="ml-auto text-emerald-600" aria-label="Successful" /> : item.status === "RETRY_PENDING" ? <Clock3 className="ml-auto text-amber-600" /> : <AlertTriangle className="ml-auto text-muted-foreground" />}
                    {item.lastError ? <p className="mt-2 max-w-xs text-xs leading-5 text-destructive">{item.lastError}</p> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {cursor ? <div className="text-center"><Button variant="outline" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(cursor).catch((error) => toast.error(getErrorMessage(error, "Unable to load more"))).finally(() => setLoadingMore(false)); }}>{loadingMore ? <Loader2 className="animate-spin" /> : null}Load more</Button></div> : null}
    </div>
  );
}
