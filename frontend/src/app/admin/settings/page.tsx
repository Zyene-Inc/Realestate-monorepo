"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Building2, CreditCard, Bell, Shield, Save } from "lucide-react"

export default function AdminSettings() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Settings</h1>
          <p className="text-muted-foreground mt-2 font-medium">Configure the agency portal and payment settings.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl  transition-[background-color,color,border-color,box-shadow,transform,opacity] font-heading group">
          <Save className="mr-2 h-4 w-4 text-current transition-transform group-hover:scale-110" />
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid h-auto w-full max-w-3xl grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/50 p-1 sm:grid-cols-4">
          <TabsTrigger value="general" className="rounded-xl font-bold font-heading text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] gap-2">
            <Building2 className="w-4 h-4" /> Agency
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl font-bold font-heading text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] gap-2">
            <CreditCard className="w-4 h-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl font-bold font-heading text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] gap-2">
            <Bell className="w-4 h-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl font-bold font-heading text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] gap-2">
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-8 space-y-6">
          <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
              <CardTitle className="text-xl font-bold font-heading tracking-tight">Agency Profile</CardTitle>
              <CardDescription className="text-muted-foreground font-medium mt-1">Public information for your agency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
                <div className="space-y-2">
                  <Label htmlFor="agency-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Agency name</Label>
                  <Input id="agency-name" name="agencyName" autoComplete="organization" defaultValue="Coach Johnson Realty" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency-email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Contact email</Label>
                  <Input id="agency-email" name="email" type="email" autoComplete="email" defaultValue="contact@coachjohnsonrealty.com" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency-address" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Business address</Label>
                <Input id="agency-address" name="address" autoComplete="street-address" defaultValue="456 Realty Dr, Kansas City, MO 64101" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-8 space-y-6">
          <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
              <CardTitle className="text-xl font-bold font-heading tracking-tight">Stripe Configuration</CardTitle>
              <CardDescription className="text-muted-foreground font-medium mt-1">Manage how you receive payments and handle fees.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-success/20 bg-success/10 p-6 sm:flex-row">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success">
                    <Shield className="h-5 w-5 text-success-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-success font-heading">Payment account connected</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-success/75 font-heading">Connection active</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-xl border-success/30 px-6 text-[10px] font-bold uppercase tracking-widest text-success hover:bg-success/10 sm:w-auto font-heading">
                  Manage on Stripe
                </Button>
              </div>
              
              <div className="space-y-6 mt-8 p-6 border border-border rounded-2xl bg-secondary/20">
                <div className="flex items-center justify-between pb-6 border-b border-border">
                  <div>
                    <Label htmlFor="pass-fees" className="font-bold text-foreground font-heading text-base">Pass processing fees to resident</Label>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">If disabled, your agency absorbs all transaction costs.</p>
                  </div>
                  <Switch id="pass-fees" defaultChecked aria-label="Pass processing fees to resident" />
                </div>
                
                <div className="grid gap-5 sm:grid-cols-2 sm:gap-8 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="ach-fee" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">ACH flat fee ($)</Label>
                    <Input id="ach-fee" name="achFee" inputMode="decimal" defaultValue="5.00" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium tabular-nums" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-fee" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Credit card fee (%)</Label>
                    <Input id="card-fee" name="cardFee" inputMode="decimal" defaultValue="2.9" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium tabular-nums" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
