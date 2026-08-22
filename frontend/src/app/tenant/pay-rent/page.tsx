"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Landmark,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TenantPayRent() {
  const [method, setMethod] = useState<"ach" | "card">("ach");

  const rent = 1200;
  const achFee = 5;
  const cardFee = 35.1;

  const total = method === "ach" ? rent + achFee : rent + cardFee;

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Pay Rent
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Secure, encrypted property payment portal.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-success">
          <ShieldCheck className="h-4 w-4" />
          Encrypted connection
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <button
              type="button"
              aria-pressed={method === "ach"}
              onClick={() => setMethod("ach")}
              className={cn(
                "group p-8 border-2 rounded-[1.25rem] text-left transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-300 relative overflow-hidden",
                method === "ach"
                  ? "border-primary bg-primary text-primary-foreground "
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <div
                className={cn(
                  "p-4 rounded-2xl w-fit mb-6 transition-colors duration-300",
                  method === "ach"
                    ? "bg-secondary/20 text-primary-foreground"
                    : "bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground",
                )}
              >
                <Landmark className="w-6 h-6 inherit-color" />
              </div>
              <h3 className="font-bold font-heading text-xl">
                ACH Bank Transfer
              </h3>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-2 font-heading",
                  method === "ach"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                Recommended / $5.00 fee
              </p>
              {method === "ach" && (
                <div className="absolute right-6 top-6 transition-transform duration-300">
                  <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
            </button>

            <button
              type="button"
              aria-pressed={method === "card"}
              onClick={() => setMethod("card")}
              className={cn(
                "group p-8 border-2 rounded-[1.25rem] text-left transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-300 relative overflow-hidden",
                method === "card"
                  ? "border-primary bg-primary text-primary-foreground "
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <div
                className={cn(
                  "p-4 rounded-2xl w-fit mb-6 transition-colors duration-300",
                  method === "card"
                    ? "bg-secondary/20 text-primary-foreground"
                    : "bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground",
                )}
              >
                <CreditCard className="w-6 h-6 inherit-color" />
              </div>
              <h3 className="font-bold font-heading text-xl">
                Credit / Debit Card
              </h3>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-2 font-heading",
                  method === "card"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                Instant / 2.9% + $0.30 fee
              </p>
              {method === "card" && (
                <div className="absolute right-6 top-6 transition-transform duration-300">
                  <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
            </button>
          </div>

          <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">
                Payment Method Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-secondary/30 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold font-heading text-xl shadow-md shadow-primary/20">
                  {method === "ach" ? "CH" : "VS"}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground font-heading tracking-tight text-lg">
                    {method === "ach"
                      ? "Chase Bank •••• 4567"
                      : "Visa Card •••• 9012"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 font-heading">
                    Primary {method === "ach" ? "Bank Account" : "Card"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl border-border hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-widest font-heading"
                >
                  Change
                </Button>
              </div>

              <div className="mt-8 p-5 bg-accent/5 rounded-2xl flex gap-4 border border-accent/10">
                <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                  Payments made after 5:00 PM EST will be processed on the next
                  business day. Please allow 1-3 business days for ACH transfers
                  to fully clear.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none bg-primary text-primary-foreground  rounded-[1.25rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck className="h-48 w-48 -mr-16 -mt-16" />
            </div>
            <CardHeader className="border-b border-white/10 py-6 px-8 relative z-10">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70 font-heading">
                Checkout Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 px-8 space-y-6 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/80 font-heading">
                  Monthly Rent
                </span>
                <span className="font-bold font-heading text-lg tabular-nums">
                  ${rent.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/80 font-heading">
                  Processing Fee
                </span>
                <span className="font-bold font-heading text-lg tabular-nums">
                  ${(method === "ach" ? achFee : cardFee).toFixed(2)}
                </span>
              </div>
              <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/75 font-heading">
                  Total Amount
                </span>
                <span className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl tabular-nums">
                  ${total.toFixed(2)}
                </span>
              </div>

              <Button className="mt-4 w-full rounded-2xl py-8 text-xs font-bold uppercase tracking-widest font-heading">
                Confirm Payment
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <p className="text-[10px] text-primary-foreground/60 font-medium text-center leading-relaxed">
                By confirming, you authorize Coach Johnson Realty to process
                this one-time transaction.
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 rounded-[1.25rem] border border-border bg-card p-6">
            <div className="p-3 bg-secondary rounded-2xl group-hover:bg-primary transition-colors">
              <ShieldCheck className="h-6 w-6 text-muted-foreground group-hover:text-primary-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-foreground uppercase tracking-widest font-heading">
                Payment processor
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                Checkout details are encrypted in transit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
