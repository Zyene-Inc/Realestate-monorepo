"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { api, setAccessToken } from "@/lib/api";
import { strongPasswordError } from "@/lib/password";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) return void toast.error("Passwords do not match");
    const passwordError = strongPasswordError(password);
    if (passwordError) return void toast.error(passwordError);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("This recovery link is invalid or expired");
      setAccessToken(data.session.access_token);
      await api.post("/auth/password-reset-complete", { password });
      await supabase.auth.signOut({ scope: "local" });
      setAccessToken(null);
      setSuccess(true);
      toast.success("Password updated");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Account recovery" title={success ? "Password updated" : "Choose a new password"} description={success ? "Your account is ready for a secure sign in." : "Use at least 12 characters with uppercase, lowercase, a number, and a symbol. Known breached passwords are blocked."}>
      {success ? (
        <div className="border-y border-border py-8 text-center" aria-live="polite">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success"><CheckCircle2 className="size-7" aria-hidden="true" /></span>
          <Link href="/#portal-access" transitionTypes={["nav-back"]} className={buttonVariants({ className: "mt-6 w-full" })}>Continue to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" name="new-password" type="password" autoComplete="new-password" placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={72} /></div>
          <div className="grid gap-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" placeholder="Enter it again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={72} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" aria-hidden="true" />Updating password</> : "Update password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
