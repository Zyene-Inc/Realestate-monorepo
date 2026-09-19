"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type Notification = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

function isSafeRoute(href: string | null): href is string {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//"));
}

export function NotificationInbox({ portal }: { portal: "tenant" | "agent" }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await api.get("/notifications")) as Notification[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load notifications"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const markRead = async (id: string) => {
    setWorkingId(id);
    try {
      await api.post(`/notifications/${id}/read`, {});
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                isRead: true,
                readAt: item.readAt ?? new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update notification"));
    } finally {
      setWorkingId(null);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all", {});
      setItems((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to mark notifications read"));
    }
  };

  const open = async (item: Notification) => {
    if (!item.isRead) await markRead(item.id);
    if (isSafeRoute(item.href)) router.push(item.href);
  };

  const unread = items.filter((item) => !item.isRead).length;
  const portalLabel = portal === "tenant" ? "Resident" : "Agent";

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            {portalLabel} updates
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Important updates from Coach Johnson Realty and your portal
            activity.
          </p>
        </div>
        {unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void markAllRead()}
          >
            <CheckCheck aria-hidden="true" /> Mark all read
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="mx-auto size-10 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">
              You are all caught up
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New portal updates will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={item.isRead ? "opacity-80" : "border-primary/35"}
            >
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle>{item.title}</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.message}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.isRead ? " · Read" : " · Unread"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!item.isRead ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={workingId === item.id}
                      onClick={() => void markRead(item.id)}
                    >
                      Read
                    </Button>
                  ) : null}
                  {isSafeRoute(item.href) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={workingId === item.id}
                      onClick={() => void open(item)}
                    >
                      <ExternalLink aria-hidden="true" /> Open
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
