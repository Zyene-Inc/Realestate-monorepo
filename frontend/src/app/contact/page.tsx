"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  submitWebsiteContactLead,
  type WebsiteLeadIntent,
} from "@/lib/website-leads";
import { toast } from "sonner";

function contactLeadIntent(intent: string | null): WebsiteLeadIntent {
  if (intent === "rent") return "RENTAL_INQUIRY";
  if (intent === "rent-tour") return "RENTAL_TOUR";
  if (intent === "rent-apply") return "RENTAL_APPLICATION";
  if (intent === "similar-rental") return "SIMILAR_RENTAL";
  if (intent === "buy-similar") return "BUYER_INQUIRY";
  if (intent === "sell") return "SELLER_INQUIRY";
  if (intent === "market-report") return "MARKET_REPORT";
  return "GENERAL";
}

const rentalLeadIntents = new Set<WebsiteLeadIntent>([
  "RENTAL_INQUIRY",
  "RENTAL_TOUR",
  "RENTAL_APPLICATION",
  "SIMILAR_RENTAL",
]);

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}>
      <ContactPageContent />
    </Suspense>
  );
}

function ContactPageContent() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const property = searchParams.get("property");
  const address = searchParams.get("address");
  const propertyId = searchParams.get("rentalId");
  const unitId = searchParams.get("unitId");
  const crmIntent = contactLeadIntent(intent);
  const needsMoveInDate = rentalLeadIntents.has(crmIntent);
  const isTourRequest = intent === "rent-tour";
  const isRentalApplication = intent === "rent-apply";
  const [minimumMoveInDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(() => {
    if (intent === "rent") {
      return `I am interested in renting${property ? ` ${property}` : " a home"}${address ? ` at ${address}` : ""}. Please share current availability and next steps.`;
    }
    if (intent === "rent-tour") {
      return `I would like to schedule a tour${property ? ` of ${property}` : ""}${address ? ` at ${address}` : ""}. My preferred dates and times are: `;
    }
    if (intent === "rent-apply") {
      return `I would like to apply${property ? ` for ${property}` : " for this rental"}${address ? ` at ${address}` : ""}. Please send me the application requirements and next steps.`;
    }
    if (intent === "similar-rental") {
      return `I saw that${property ? ` ${property}` : " a property"}${address ? ` at ${address}` : ""} has been rented. Please help me find a similar available home.`;
    }
    if (intent === "buy-similar")
      return "I saw a sold property on your website and would like help finding a similar available home.";
    if (intent === "sell")
      return "I would like to discuss selling my property and building a clear pricing and preparation plan.";
    if (intent === "market-report")
      return "I would like a local market report. The neighborhood or property address I am interested in is: ";
    return "";
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      await submitWebsiteContactLead({
        name: String(data.get("name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim() || undefined,
        message: message.trim(),
        intent: crmIntent,
        propertyId: propertyId ?? undefined,
        unitId: unitId ?? undefined,
        moveInDate: needsMoveInDate
          ? String(data.get("moveInDate") ?? "")
          : undefined,
        website: String(data.get("website") ?? ""),
      });
      toast.success(
        isTourRequest
          ? "Tour request sent to the rental team."
          : isRentalApplication
            ? "Application request sent to the rental team."
            : "Message sent to Johnson Realty.",
      );
      form.reset();
      setMessage("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send your request"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        <main
          id="main-content"
          className="public-container grid gap-12 py-16 sm:py-24 lg:grid-cols-[.82fr_1.18fr] lg:gap-20 lg:py-28"
        >
          <section>
            <p className="text-sm font-semibold text-primary">Contact</p>
            <h1 className="mt-4 max-w-xl text-[clamp(3rem,6vw,5.8rem)] font-semibold leading-[.98] tracking-[-0.05em]">
              A direct line to the right person.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Tell us what you need. Property questions, management
              conversations, and resident support are routed to the team that
              can help.
            </p>
            <div className="mt-12 border-t border-border">
              {[
                [
                  Mail,
                  "Email",
                  "info@coachjohnsonrealty.com",
                  "mailto:info@coachjohnsonrealty.com",
                ],
                [Phone, "Phone", "(816) 555-0147", "tel:+18165550147"],
                [MapPin, "Office", "Midtown Kansas City, Missouri", undefined],
              ].map(([Icon, label, value, href]) => {
                const ItemIcon = Icon as typeof Mail;
                const content = (
                  <>
                    <ItemIcon
                      className="size-5 text-primary"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted-foreground">
                      {label as string}
                    </span>
                    <span className="text-sm font-semibold text-foreground sm:text-right">
                      {value as string}
                    </span>
                  </>
                );
                return href ? (
                  <a
                    key={label as string}
                    href={href as string}
                    className="grid min-h-16 grid-cols-[2rem_1fr] items-center gap-3 border-b border-border py-4 hover:text-primary sm:grid-cols-[2rem_7rem_1fr]"
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={label as string}
                    className="grid min-h-16 grid-cols-[2rem_1fr] items-center gap-3 border-b border-border py-4 sm:grid-cols-[2rem_7rem_1fr]"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card p-5 sm:p-8 lg:p-10">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">
              {isTourRequest
                ? "Request a property tour"
                : isRentalApplication
                  ? "Start your rental application"
                  : "Send a message"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isTourRequest
                ? "Share your contact details and preferred times. The rental team will confirm the appointment."
                : isRentalApplication
                  ? "Share your contact details. The rental team will confirm availability and send the secure application requirements."
                  : "Share enough context for us to respond usefully."}
            </p>
            <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" autoComplete="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email">Email address</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="contact-phone">
                  Phone{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                />
              </div>
              {needsMoveInDate ? (
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="move-in-date">Preferred move-in date</Label>
                  <Input
                    id="move-in-date"
                    name="moveInDate"
                    type="date"
                    min={minimumMoveInDate}
                    required
                  />
                </div>
              ) : null}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="message">How can we help?</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  placeholder="Property address, resident question, or the service you are looking for"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[10000px] size-px overflow-hidden"
              />
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={sending}
                >
                  {sending
                    ? "Sending…"
                    : isTourRequest
                      ? "Request tour"
                      : isRentalApplication
                        ? "Request application"
                        : "Send message"}
                  {!sending && <ArrowRight aria-hidden="true" />}
                </Button>
              </div>
            </form>
          </section>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
