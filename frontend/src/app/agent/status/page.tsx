"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock3, Loader2, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { AgentSettings } from "@/components/agent/agent-settings";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AgentStatusPage() {
  const { user, logout, isLoading } = useAuth();
  const [resubmitted, setResubmitted] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const profile = user?.agentProfile;
  const status = resubmitted ? "PENDING" : profile?.accountStatus;

  async function resubmit() {
    setResubmitting(true);
    try {
      await api.post("/agents/me/resubmit", {});
      setResubmitted(true);
      toast.success("Application returned for review");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to resubmit application"));
    } finally {
      setResubmitting(false);
    }
  }

  if (isLoading) return <main id="main-content" className="mx-auto min-h-[100dvh] max-w-3xl px-5 py-16"><Skeleton className="h-10 w-48" /><Skeleton className="mt-12 h-72 w-full rounded-[1.5rem]" /></main>;

  if (!user) return <main id="main-content" className="flex min-h-[100dvh] items-center justify-center p-5"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Sign in required</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Use the account connected to your company application.</p><Link href="/#portal-access" className={buttonVariants({ className: "mt-6" })}>Return to sign in</Link></CardContent></Card></main>;

  const declined = status === "DECLINED";
  const approved = status === "APPROVED";
  const Icon = declined ? XCircle : approved ? ShieldCheck : Clock3;
  const tone = declined ? "text-destructive bg-destructive/10" : approved ? "text-success bg-success/12" : "text-warning-foreground bg-warning/18";

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/90 py-3 backdrop-blur-xl"><div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 sm:px-8"><Logo className="h-9" /><div className="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out"><LogOut aria-hidden="true" /></Button></div></div></header>
      <main id="main-content" className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div className={cn("flex size-20 items-center justify-center rounded-[1.35rem]", tone)}><Icon className="size-9" strokeWidth={1.6} aria-hidden="true" /></div>
          <div>
            <p className="text-sm font-semibold text-primary">Company review</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{approved ? "Your company is approved" : declined ? "Your application needs attention" : "Your application is under review"}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{approved ? "You can now create sale listings, send them for review, and respond to buyer questions from the company workspace." : declined ? profile?.declineReason || "Review the company information below and contact our team if you need more context." : "The property team is reviewing your company details and documents. A decision will be sent to your email."}</p>
            <div className="mt-6 flex flex-wrap gap-3">{approved ? <Link href="/agent/listings" className={buttonVariants()}>Open company workspace</Link> : null}<Button variant="outline" onClick={logout}><LogOut aria-hidden="true" />Sign out</Button></div>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside className="text-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Application</p><p className="mt-3 font-semibold">{profile?.companyName}</p><p className="mt-1 break-all text-muted-foreground">{user.email}</p></aside>
          <div>
            {!approved ? <AgentSettings documentsOnly={!declined} /> : null}
            {declined ? <Card className="mt-6 border-primary/25"><CardContent className="p-6"><h2 className="text-xl font-semibold tracking-[-0.025em]">Ready for another review?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Update the company details and verification documents above, then return the application to the review queue.</p><Button className="mt-5" onClick={() => void resubmit()} disabled={resubmitting}>{resubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}Resubmit application</Button></CardContent></Card> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
