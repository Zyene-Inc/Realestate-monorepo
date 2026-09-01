"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileQuestion, Loader2 } from "lucide-react";
import { RentalApplicationWorkspace } from "@/components/public/rental-application-workspace";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  getRentalApplication,
  type RentalApplication,
} from "@/lib/rental-applications";

export default function RentalApplicationStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<RentalApplication | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void getRentalApplication(id)
      .then((result) => {
        if (active) setApplication(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main id="main-content" className="public-container py-10 sm:py-14 lg:py-16">
        {!application && !failed ? (
          <div className="flex min-h-[60dvh] items-center justify-center">
            <Loader2 className="size-7 animate-spin text-primary" aria-label="Loading application" />
          </div>
        ) : failed || !application ? (
          <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
            <FileQuestion className="size-12 text-primary" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
              Secure access required
            </h1>
            <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
              Open the latest application-status email on this device, or
              contact the rental team for a new secure link.
            </p>
            <Link href="/contact?intent=rent" className={buttonVariants({ className: "mt-6" })}>
              Contact rental team
            </Link>
          </div>
        ) : (
          <>
            <header className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold text-primary">Your secure application</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                {application.property.name}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Review your current status, complete any requested documents,
                and pay the application fee only when shown.
              </p>
            </header>
            <RentalApplicationWorkspace initialApplication={application} />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
