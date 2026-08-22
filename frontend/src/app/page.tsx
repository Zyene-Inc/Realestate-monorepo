"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { navigateToUserPortal } from "@/lib/auth-routing";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const { login, user, isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) navigateToUserPortal(router, user, "replace");
  }, [isAuthLoading, router, user]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const authenticatedUser = await login(email, password);
      toast.success("Signed in");
      navigateToUserPortal(router, authenticatedUser);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Incorrect email or password"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="public-container grid min-h-[calc(100dvh-4.5rem)] gap-5 py-5 lg:grid-cols-[minmax(0,1.28fr)_minmax(24rem,.72fr)]">
          <div className="relative min-h-[28rem] overflow-hidden rounded-[1.75rem] lg:min-h-0">
            <Image
              src="/hero-community.png"
              alt="Restored brick apartment building in a tree-lined Kansas City neighborhood"
              fill
              priority
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,oklch(0.16_0.025_159/0.88)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-[oklch(0.985_0.009_78)] sm:p-10 lg:p-12">
              <p className="max-w-3xl text-[clamp(2.5rem,5.6vw,5.6rem)] font-semibold leading-[.98] tracking-[-0.05em]">
                Homes are personal. Management should be too.
              </p>
              <div className="mt-6 flex flex-col gap-5 border-t border-[oklch(0.985_0.009_78/0.28)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-sm leading-6 text-[oklch(0.94_0.012_78/0.82)] sm:text-base">
                  Local stewardship, responsive service, and clear tools for every step of the rental experience.
                </p>
                <Button nativeButton={false} variant="outline" className="border-[oklch(0.985_0.009_78/0.48)] bg-[oklch(0.985_0.009_78/0.1)] text-[oklch(0.985_0.009_78)] hover:bg-[oklch(0.985_0.009_78)] hover:text-[oklch(0.23_0.024_159)]" render={<Link href="/properties" transitionTypes={["nav-forward"]} />}>
                  View properties <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          <div id="portal-access" className="flex scroll-mt-24 flex-col justify-center rounded-[1.75rem] border border-border bg-card px-5 py-8 sm:px-8 lg:px-10">
            <div className="mb-8">
              <p className="text-sm font-semibold text-primary">Secure portal</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Welcome back</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">One sign-in routes residents, agents, and staff to the right workspace.</p>
            </div>
            <form onSubmit={handleLogin} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" name="email" type="email" autoComplete="email" spellCheck={false} placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/auth/forgot-password" data-testid="forgot-password-link" className="rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25">Forgot password?</Link>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <Button type="submit" className="mt-1 w-full" disabled={isLoading || isAuthLoading}>
                {isLoading ? "Signing in…" : "Sign in securely"}
                {!isLoading && <ArrowRight aria-hidden="true" />}
              </Button>
            </form>
            <div className="mt-7 grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <p>New agent company? <Link className="font-semibold text-foreground hover:text-primary" href="/agent/signup" transitionTypes={["nav-forward"]}>Apply for approval</Link></p>
              <p>Property staff can also use the <Link className="font-semibold text-foreground hover:text-primary" href="/admin/login" transitionTypes={["nav-forward"]}>administration sign-in</Link>.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-14 sm:py-20">
          <div className="public-container grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-primary">Built around real needs</p>
              <h2 className="mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Less chasing. More certainty.</h2>
            </div>
            <div className="grid gap-0 border-t border-border">
              {[
                [ShieldCheck, "Residents", "See balances, lease details, requests, documents, and messages in one place."],
                [Building2, "Property teams", "Track occupancy, maintenance, payments, vendors, and resident communication."],
                [KeyRound, "Agent companies", "Submit listings, follow review status, and respond to buyer inquiries."],
              ].map(([Icon, title, copy]) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={title as string} className="grid gap-4 border-b border-border py-6 sm:grid-cols-[3rem_10rem_1fr] sm:items-start">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary"><ItemIcon className="size-5" strokeWidth={1.8} aria-hidden="true" /></span>
                    <h3 className="text-base font-semibold">{title as string}</h3>
                    <p className="max-w-xl text-sm leading-6 text-muted-foreground">{copy as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
