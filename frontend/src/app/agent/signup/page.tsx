"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, CheckCircle2, Loader2, Mail, Phone, UserRound, type LucideIcon } from "lucide-react"
import { api } from "@/lib/api"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/logo"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/errors"

const initialForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
}

export default function AgentSignupPage() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (form.password.length < 12) {
      toast.error("Password must be at least 12 characters")
      return
    }

    setLoading(true)
    try {
      await api.post("/auth/agent-signup", {
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      })
      setSubmitted(true)
      toast.success("Application submitted")
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to submit application"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to portal
        </Link>

        <Card className="overflow-hidden rounded-[2rem] border-border shadow-2xl shadow-primary/10">
          <div className="bg-primary px-8 py-7 text-primary-foreground">
            <Logo className="mb-5 h-9 text-primary-foreground" />
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground/60">Buy / Sell Network</p>
            <h1 className="mt-2 text-3xl font-bold font-heading">Agent company application</h1>
          </div>

          {submitted ? (
            <CardContent className="space-y-5 p-10 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold font-heading">Check your email</h2>
                <p className="mt-2 text-muted-foreground">Verify your email address to complete submission. Johnson Realty will review the company after verification.</p>
              </div>
              <Link href="/" className={buttonVariants({ className: "rounded-xl" })}>Return to sign in</Link>
            </CardContent>
          ) : (
            <>
              <CardHeader className="px-8 pt-8">
                <CardTitle>Company details</CardTitle>
                <CardDescription>Applications stay pending until reviewed by Johnson Realty.</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                  <Field icon={Building2} label="Company name">
                    <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required minLength={2} maxLength={120} />
                  </Field>
                  <Field icon={UserRound} label="Primary contact">
                    <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} required minLength={2} maxLength={120} />
                  </Field>
                  <Field icon={Mail} label="Business email">
                    <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                  </Field>
                  <Field icon={Phone} label="Phone (optional)">
                    <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                  </Field>
                  <Field label="Password">
                    <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={12} autoComplete="new-password" />
                  </Field>
                  <Field label="Confirm password">
                    <Input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required minLength={12} autoComplete="new-password" />
                  </Field>
                  <div className="sm:col-span-2 pt-2">
                    <Button className="h-12 w-full rounded-xl font-bold" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit application"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span className="flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}{label}</span>
      {children}
    </label>
  )
}
