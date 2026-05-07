"use client"

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone, Mail, MapPin, Car, Dog, ArrowRight, ShieldAlert } from "lucide-react"
import { useAuth } from "@/context/auth-context"

export default function TenantProfile() {
  const { user } = useAuth()
  const profile = user?.tenantProfile

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-2 font-medium">Manage your contact information and property preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group">
          <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
            <CardTitle className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.15em] text-foreground font-heading">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <User className="w-4 h-4" />
              </div>
              Personal Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                <Input 
                  defaultValue={profile?.firstName || "Resident"} 
                  className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                <Input 
                  defaultValue={profile?.lastName || ""} 
                  className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  defaultValue={user?.email || ""} 
                  disabled 
                  className="h-12 rounded-xl bg-secondary/50 border-transparent pl-11 font-medium opacity-70"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  defaultValue={profile?.phone || ""} 
                  placeholder="(555) 000-0000"
                  className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all pl-11 font-medium"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-0">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all premium-button font-heading">
              Update Information
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
            <CardTitle className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.15em] text-foreground font-heading">
              <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <MapPin className="w-4 h-4" />
              </div>
              Lease Address
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="p-6 bg-secondary/50 rounded-2xl border border-border flex items-start gap-4 group-hover:border-primary/20 transition-all">
              <div className="mt-1">
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </div>
              <div>
                <p className="font-bold text-foreground font-heading">{profile?.unitId ? `Unit ID: ${profile.unitId}` : "No Active Unit"}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Coach Johnson Realty Property</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                <Car className="w-3.5 h-3.5" /> Vehicle Information
              </Label>
              <Input 
                defaultValue={profile?.vehicleInfo || ""} 
                placeholder="e.g. 2022 Silver Toyota Camry (ABC-1234)"
                className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                <Dog className="w-3.5 h-3.5" /> Pet Information
              </Label>
              <Input 
                defaultValue={profile?.petInfo || ""} 
                placeholder="e.g. 1 Golden Retriever (Buddy)"
                className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border py-6 px-8 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-foreground font-heading">Emergency Contact</CardTitle>
            <ShieldAlert className="w-5 h-5 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6 p-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Contact Name</Label>
              <Input 
                defaultValue={profile?.emergencyContactName || ""} 
                placeholder="Full Name"
                className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Relationship</Label>
              <Input 
                defaultValue="" 
                placeholder="e.g. Spouse, Parent"
                className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
              <Input 
                defaultValue={profile?.emergencyContactPhone || ""} 
                placeholder="(555) 000-0000"
                className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:bg-background transition-all font-medium"
              />
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-0 justify-end">
            <Button variant="outline" className="h-12 px-8 rounded-xl border-border hover:bg-secondary text-xs font-bold uppercase tracking-widest font-heading transition-all">
              Save Contact
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 p-8 bg-destructive/5 border border-destructive/10 rounded-3xl group">
        <div>
          <h4 className="font-bold font-heading text-lg text-destructive">Moving Out?</h4>
          <p className="text-sm text-destructive/80 font-medium mt-1">Submit a formal 30-day notice to initiate the move-out process.</p>
        </div>
        <Button variant="destructive" className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-destructive/20 font-heading group-hover:bg-destructive/90 transition-all">
          Submit Notice
        </Button>
      </div>
    </div>
  )
}
