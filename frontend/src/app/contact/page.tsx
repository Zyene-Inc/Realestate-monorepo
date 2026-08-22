"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ContactPage() {
  const [sending, setSending] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      toast.success("Message prepared. Our team will follow up shortly.");
      form.reset();
    }, 500);
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        <main id="main-content" className="public-container grid gap-12 py-16 sm:py-24 lg:grid-cols-[.82fr_1.18fr] lg:gap-20 lg:py-28">
          <section>
            <p className="text-sm font-semibold text-primary">Contact</p>
            <h1 className="mt-4 max-w-xl text-[clamp(3rem,6vw,5.8rem)] font-semibold leading-[.98] tracking-[-0.05em]">A direct line to the right person.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Tell us what you need. Property questions, management conversations, and resident support are routed to the team that can help.</p>
            <div className="mt-12 border-t border-border">
              {[
                [Mail, "Email", "info@coachjohnsonrealty.com", "mailto:info@coachjohnsonrealty.com"],
                [Phone, "Phone", "(816) 555-0147", "tel:+18165550147"],
                [MapPin, "Office", "Midtown Kansas City, Missouri", undefined],
              ].map(([Icon, label, value, href]) => {
                const ItemIcon = Icon as typeof Mail;
                const content = <><ItemIcon className="size-5 text-primary" strokeWidth={1.8} aria-hidden="true" /><span className="text-sm text-muted-foreground">{label as string}</span><span className="text-sm font-semibold text-foreground sm:text-right">{value as string}</span></>;
                return href ? <a key={label as string} href={href as string} className="grid min-h-16 grid-cols-[2rem_1fr] items-center gap-3 border-b border-border py-4 hover:text-primary sm:grid-cols-[2rem_7rem_1fr]">{content}</a> : <div key={label as string} className="grid min-h-16 grid-cols-[2rem_1fr] items-center gap-3 border-b border-border py-4 sm:grid-cols-[2rem_7rem_1fr]">{content}</div>;
              })}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card p-5 sm:p-8 lg:p-10">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Send a message</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Share enough context for us to respond usefully.</p>
            <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required /></div>
              <div className="grid gap-2"><Label htmlFor="contact-email">Email address</Label><Input id="contact-email" name="email" type="email" autoComplete="email" required /></div>
              <div className="grid gap-2 sm:col-span-2"><Label htmlFor="contact-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="contact-phone" name="phone" type="tel" autoComplete="tel" /></div>
              <div className="grid gap-2 sm:col-span-2"><Label htmlFor="message">How can we help?</Label><Textarea id="message" name="message" required placeholder="Property address, resident question, or the service you are looking for" /></div>
              <div className="sm:col-span-2"><Button type="submit" size="lg" className="w-full sm:w-auto" disabled={sending}>{sending ? "Sending…" : "Send message"}{!sending && <ArrowRight aria-hidden="true" />}</Button></div>
            </form>
          </section>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
