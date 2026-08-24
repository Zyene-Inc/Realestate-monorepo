"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  property: { id: string; name: string } | null;
  unit: { id: string; unitNumber: string } | null;
};

export default function TenantAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/tenant/portal/announcements")
      .then((rows: Announcement[]) => setAnnouncements(rows))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load announcements")),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <p className="text-sm font-semibold text-primary">
          Resident communication
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Announcements
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Updates from Coach Johnson Realty for your home and community.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="mx-auto size-10 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">
              No announcements right now
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Important updates for your home will appear here.
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
