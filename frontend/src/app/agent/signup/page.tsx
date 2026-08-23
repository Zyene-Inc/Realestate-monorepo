"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Building2, CheckCircle2, Loader2, Mail, Phone, UserRound, type LucideIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { strongPasswordError } from "@/lib/password";
import { toast } from "sonner";

const initialForm = { companyName: "", contactName: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function AgentSignupPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return void toast.error("Passwords do not match");
    const passwordError = strongPasswordError(form.password);
    if (passwordError) return void toast.error(passwordError);
    setLoading(true);
    try {
      await api.post("/auth/agent-signup", { companyName: form.companyName, contactName: form.contactName, email: form.email, phone: form.phone || undefined, password: form.password });
      setSubmitted(true);
      toast.success("Application submitted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to submit application"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell wide eyebrow="Agent company network" title={submitted ? "Verify your email" : "Apply to present properties"} description={submitted ? "Open the secure link in your inbox to complete submission. We review the company after email verification." : "Approved companies can submit sale listings, follow review decisions, and speak directly with interested buyers."}>
      {submitted ? (
        <div className="border-y border-border py-8 text-center" aria-live="polite">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success"><CheckCircle2 className="size-7" aria-hidden="true" /></span>
          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-muted-foreground">The verification message was sent to <strong className="font-semibold text-foreground">{form.email}</strong>. Your review begins after that step.</p>
          <Link href="/agent/login" transitionTypes={["nav-back"]} className={buttonVariants({ variant: "outline", className: "mt-6" })}>Return to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <Field id="company-name" icon={Building2} label="Company name"><Input id="company-name" name="companyName" autoComplete="organization" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} required minLength={2} maxLength={120} /></Field>
          <Field id="contact-name" icon={UserRound} label="Primary contact"><Input id="contact-name" name="contactName" autoComplete="name" value={form.contactName} onChange={(event) => update("contactName", event.target.value)} required minLength={2} maxLength={120} /></Field>
          <Field id="business-email" icon={Mail} label="Business email"><Input id="business-email" name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} required maxLength={254} /></Field>
          <Field id="business-phone" icon={Phone} label="Phone" optional><Input id="business-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
          <Field id="application-password" label="Password"><Input id="application-password" name="password" type="password" autoComplete="new-password" placeholder="12+ mixed characters" value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={12} maxLength={72} /></Field>
          <Field id="application-confirm-password" label="Confirm password"><Input id="application-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Enter it again" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required minLength={12} maxLength={72} /></Field>
          <div className="border-t border-border pt-5 sm:col-span-2"><Button className="w-full sm:w-auto" disabled={loading}>{loading ? <><Loader2 className="animate-spin" aria-hidden="true" />Submitting application</> : "Submit for review"}</Button><p className="mt-4 text-xs leading-5 text-muted-foreground">Applications remain pending until company details and verification documents are reviewed.</p></div>
        </form>
      )}
    </AuthShell>
  );
}

function Field({ id, label, icon: Icon, optional = false, children }: { id: string; label: string; icon?: LucideIcon; optional?: boolean; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label htmlFor={id} className="flex items-center gap-2">{Icon ? <Icon className="size-4 text-primary" aria-hidden="true" /> : null}{label}{optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}</Label>{children}</div>;
}
