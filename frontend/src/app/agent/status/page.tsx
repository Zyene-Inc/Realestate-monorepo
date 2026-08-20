"use client";

import Link from "next/link";
import { Clock3, LogOut, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { AgentSettings } from "@/components/agent/agent-settings";

export default function AgentStatusPage() {
  const { user, logout, isLoading } = useAuth();
  const profile = user?.agentProfile;
  const status = profile?.accountStatus;

  if (isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading account…
      </main>
    );

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle>Sign in required</CardTitle>
          <Link href="/" className={buttonVariants({ className: "mt-6" })}>
            Return to login
          </Link>
        </Card>
      </main>
    );
  }

  const declined = status === "DECLINED";
  const approved = status === "APPROVED";
  const Icon = declined ? XCircle : approved ? ShieldCheck : Clock3;

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Logo className="mx-auto mb-8 h-10" />
        <Card className="rounded-[2rem] p-4 shadow-xl">
          <CardHeader className="items-center text-center">
            <Icon
              className={`mb-3 h-16 w-16 ${declined ? "text-red-500" : approved ? "text-green-600" : "text-amber-500"}`}
            />
            <CardTitle className="text-3xl font-heading">
              {approved
                ? "Application approved"
                : declined
                  ? "Application needs attention"
                  : "Application under review"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              {approved
                ? "Your agent company is approved. You can now create and submit sale listings for Johnson Realty review."
                : declined
                  ? profile?.declineReason ||
                    "Contact Johnson Realty for details about this decision."
                  : "Johnson Realty is reviewing your company details. We will email you when a decision is made."}
            </p>
            <div className="rounded-xl bg-secondary p-4 text-sm">
              <strong>{profile?.companyName}</strong>
              <br />
              {user.email}
            </div>
            {approved && (
              <Link
                href="/agent/listings"
                className={buttonVariants({ className: "rounded-xl" })}
              >
                Open listing portal
              </Link>
            )}
            <Button variant="outline" onClick={logout} className="rounded-xl">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
        {!approved && (
          <div className="mt-8">
            <AgentSettings documentsOnly />
          </div>
        )}
      </div>
    </main>
  );
}
