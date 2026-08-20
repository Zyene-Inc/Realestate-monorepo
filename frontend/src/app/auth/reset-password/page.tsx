"use client"

import { Suspense, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Lock, Loader2, CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

function ResetPasswordForm() {
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match")
    }

    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters")
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      toast.success("Password reset successful")
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset password",
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <Card className="w-full max-w-md shadow-2xl shadow-primary/10 rounded-[2.5rem] border-border overflow-hidden bg-card p-10 text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-inner">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold font-heading text-foreground">Success!</h2>
            <p className="text-muted-foreground font-medium leading-relaxed">Your password has been updated. You can now securely log in to your portal.</p>
          </div>
          <div className="pt-6">
            <Link href="/tenant/login" className="block">
              <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all premium-button font-heading">
                Proceed to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl shadow-primary/10 rounded-[2.5rem] border-border bg-card overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-primary p-8 flex justify-center border-b border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <Logo className="h-10 text-primary-foreground relative z-10" />
        </div>

        <CardHeader className="p-8 pb-4 space-y-2 text-center">
          <CardTitle className="text-3xl font-bold font-heading tracking-tight text-foreground mt-2">Reset Password</CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            Create a new, secure password for your account.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-14 pl-12 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all text-base font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Confirm New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-14 pl-12 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all text-base font-medium"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-primary/20 mt-4 premium-button font-heading"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
