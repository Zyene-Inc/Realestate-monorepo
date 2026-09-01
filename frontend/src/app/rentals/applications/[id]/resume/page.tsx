"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { exchangeRentalApplicationSession } from "@/lib/rental-applications";

export default function ResumeRentalApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState({}, "", window.location.pathname);
    if (!token) {
      const timeout = window.setTimeout(() => setFailed(true), 0);
      return () => window.clearTimeout(timeout);
    }
    void exchangeRentalApplicationSession(id, token)
      .then(() => window.location.replace(`/rentals/applications/${id}`))
      .catch(() => setFailed(true));
  }, [id, router]);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main id="main-content" className="public-container flex min-h-[70dvh] flex-col items-center justify-center text-center">
        {failed ? (
          <>
            <h1 className="text-3xl font-semibold">This secure link is unavailable</h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              It may have expired or already been used. Ask the rental team for
              a new application-status link.
            </p>
            <Button className="mt-6" onClick={() => router.push("/contact?intent=rent")}>
              Contact rental team
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-4 font-semibold">Opening your secure application…</p>
          </>
        )}
      </main>
    </div>
  );
}
