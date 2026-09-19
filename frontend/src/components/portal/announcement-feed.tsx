"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  requiresAcknowledgement: boolean;
  acknowledgedAt: string | null;
};

export function AnnouncementFeed({ portal }: { portal: "tenant" | "agent" }) {
  const basePath =
    portal === "tenant"
      ? "/tenant/portal/announcements"
      : "/agent/announcements";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnnouncements((await api.get(basePath)) as Announcement[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load announcements"));
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const acknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      const result = (await api.post(`${basePath}/${id}/acknowledge`, {})) as {
        acknowledgedAt: string;
      };
      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === id
            ? { ...announcement, acknowledgedAt: result.acknowledgedAt }
            : announcement,
        ),
      );
      toast.success("Acknowledgement recorded");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to record acknowledgement"));
    } finally {
      setAcknowledgingId(null);
    }
  };

  const label =
    portal === "tenant" ? "Resident communication" : "Agent communication";
  const description =
    portal === "tenant"
      ? "Updates from Coach Johnson Realty for your home and community."
      : "Important company-wide updates from Coach Johnson Realty.";

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <p className="text-sm font-semibold text-primary">{label}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Announcements
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone
              className="mx-auto size-10 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">
              No announcements right now
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Important updates will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Megaphone className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {announcement.title}
                    </h2>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" aria-hidden="true" />
                      {new Date(announcement.createdAt).toLocaleDateString(
                        undefined,
                        { dateStyle: "long" },
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-5 border-l-2 border-primary/30 pl-4 text-sm leading-6 text-muted-foreground">
                  {announcement.content}
                </p>
                {announcement.requiresAcknowledgement ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {announcement.acknowledgedAt ? (
                      <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Acknowledged{" "}
                        {new Date(
                          announcement.acknowledgedAt,
                        ).toLocaleDateString()}
                      </p>
                    ) : (
                      <Button
                        type="button"
                        disabled={acknowledgingId === announcement.id}
                        onClick={() => void acknowledge(announcement.id)}
                      >
                        {acknowledgingId === announcement.id
                          ? "Recording…"
                          : "Acknowledge update"}
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
