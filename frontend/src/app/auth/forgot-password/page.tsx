"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/password-reset-request", { email });
      setSubmitted(true);
      toast.success("Request received");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to request a reset link"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Account recovery" title={submitted ? "Check your inbox" : "Reset your password"} description={submitted ? "If this address matches an account, a secure recovery link is on its way." : "Enter the email connected to your portal account. Recovery links expire for your protection."}>
      {submitted ? (
        <div className="border-y border-border py-8 text-center" aria-live="polite">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success"><CheckCircle2 className="size-7" aria-hidden="true" /></span>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">You can close this page after checking <strong className="font-semibold text-foreground">{email}</strong>. Also check the spam folder if the message takes a moment.</p>
          <Link href="/#portal-access" transitionTypes={["nav-back"]} className={buttonVariants({ variant: "outline", className: "mt-6 w-full" })}>Return to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="recovery-email">Email address</Label>
            <Input id="recovery-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" aria-hidden="true" />Requesting link</> : "Send secure link"}</Button>
          <p className="text-xs leading-5 text-muted-foreground">For privacy, the response is the same whether or not an account exists for this address.</p>
        </form>
      )}
    </AuthShell>
  );
}
