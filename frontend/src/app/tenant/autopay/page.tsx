"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CreditCard, AlertTriangle, RefreshCw, Calendar, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function TenantAutoPay() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Auto-Pay</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage automated monthly property payments.</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-[background-color,color,border-color,box-shadow,transform,opacity]",
          enabled 
            ? "border-success/20 bg-success/10 text-success"
            : "bg-secondary text-muted-foreground border-border"
        )}>
          <RefreshCw className={cn("h-4 w-4", enabled && "animate-spin-slow")} />
          {enabled ? 'System Active' : 'System Paused'}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className={cn(
            "border-2 rounded-[1.25rem] overflow-hidden transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-300",
            enabled ? "border-primary bg-card shadow-xl shadow-primary/10" : "border-border bg-card"
          )}>
            <CardHeader className="p-8 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold font-heading tracking-tight">Recurring Payment Status</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                    {enabled 
                      ? "Rent will be automatically deducted on the 1st of each month." 
                      : "Automatic payments are currently disabled."}
                  </p>
                </div>
                <div className="flex items-center space-x-4 bg-background p-3 rounded-2xl border border-border">
                   <Label htmlFor="autopay-mode" className="text-[11px] font-bold uppercase tracking-widest cursor-pointer ml-2">
                    {enabled ? 'ON' : 'OFF'}
                  </Label>
                  <Switch 
                    id="autopay-mode" 
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-border bg-secondary/50 p-6 md:flex-row">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold font-heading text-xl shadow-md shadow-primary/20">
                    CH
                  </div>
                  <div>
                    <p className="font-bold text-foreground font-heading tracking-tight text-lg">Chase Bank •••• 4567</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Primary Payment Source</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full md:w-auto rounded-xl border-border hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-widest h-12 px-8 font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity]">Modify</Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Next Billing Date</span>
                  </div>
                  <p className="text-2xl font-bold font-heading text-foreground">May 1, 2026</p>
                </div>
                <div className="p-6 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-4 w-4 text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Projected Amount</span>
                  </div>
                  <p className="text-2xl font-bold font-heading text-foreground tabular-nums">$1,205.00</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-10 bg-primary rounded-[2.5rem] text-primary-foreground  relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-700">
              <AlertTriangle className="h-32 w-32 -mr-8 -mt-8" />
            </div>
            <h4 className="font-bold font-heading text-2xl mb-6 relative z-10">Payment Policy</h4>
            <div className="space-y-4 max-w-lg relative z-10">
              <p className="text-[11px] text-primary-foreground/80 font-medium uppercase tracking-[0.1em] leading-relaxed">
                1. Auto-pay transactions are initiated at 12:01 AM EST on the 1st of the month.
              </p>
              <p className="text-[11px] text-primary-foreground/80 font-medium uppercase tracking-[0.1em] leading-relaxed">
                2. Failed transactions may result in a $35.00 late fee if not resolved within 3 business days.
              </p>
              <p className="text-[11px] text-primary-foreground/80 font-medium uppercase tracking-[0.1em] leading-relaxed">
                3. You can disable or modify auto-pay settings up to 24 hours before the scheduled billing date.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-foreground uppercase tracking-widest font-heading">Auto-pay Processed</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest mt-1">April 1, 2026</p>
                  </div>
                  <span className="text-sm font-bold font-heading tabular-nums">$1,205.00</span>
                </div>
              ))}
              <Button variant="ghost" className="w-full mt-4 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary group font-heading">
                Full History
                <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
          
          <div className="rounded-[1.25rem] bg-brand p-8 text-white">
            <h5 className="font-bold font-heading text-xl mb-3">Need Assistance?</h5>
            <p className="text-[11px] font-medium uppercase tracking-widest leading-relaxed mb-8 opacity-80">
              If you encounter issues with your bank connection, our support team is available 24/7.
            </p>
            <Button variant="outline" className="w-full rounded-xl border-white/35 bg-transparent py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:border-white hover:bg-white hover:text-brand font-heading">
              Contact Billing
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
