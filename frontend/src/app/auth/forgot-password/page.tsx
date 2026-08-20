"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/password-reset-request", { email });
      setSubmitted(true);
      toast.success("Reset link sent if account exists");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

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

        <CardHeader className="space-y-2 p-8 pb-4">
          <CardTitle className="text-3xl font-bold font-heading tracking-tight text-center text-foreground mt-2">
            Recovery
          </CardTitle>
          <CardDescription className="text-center font-medium text-muted-foreground">
            Enter your email to receive a secure reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 pt-2">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="h-14 pl-12 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all text-base font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-widest font-heading transition-all shadow-lg shadow-primary/20 premium-button mt-4 rounded-2xl"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <div className="text-center mt-6 pt-6 border-t border-border">
                <Link
                  href="/"
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors uppercase tracking-widest font-heading"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6 py-6 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner border border-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Check your inbox! We&apos;ve sent a recovery link to{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
              <div className="pt-6 border-t border-border">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center h-14 w-full rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold uppercase tracking-widest font-heading transition-all border border-border"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
