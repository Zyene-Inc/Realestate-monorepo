"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, DoorOpen, Users, CreditCard, Wrench, AlertCircle, Megaphone, ArrowUpRight } from "lucide-react"

export default function AdminDashboard() {
  const stats = [
    { title: "Total Properties", value: "12", icon: Building2, trend: "+1 this month" },
    { title: "Total Units", value: "156", icon: DoorOpen, trend: "98% occupancy" },
    { title: "Active Tenants", value: "148", icon: Users, trend: "+4 this month" },
    { title: "Rent Collected", value: "$184,200", icon: CreditCard, trend: "92% of expected" },
    { title: "Open Maintenance", value: "8", icon: Wrench, trend: "3 high priority" },
    { title: "Overdue Payments", value: "5", icon: AlertCircle, trend: "$6,400 total" },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Management Dashboard</h1>
          <p className="text-muted-foreground mt-2 font-medium">Portfolio overview and daily operations summary.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-secondary border border-border rounded-2xl shadow-sm">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading leading-none">Portfolio</p>
            <p className="text-sm font-bold text-foreground font-heading">Healthy</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={stat.title} className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl group relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground font-heading tabular-nums">{stat.value}</div>
              <p className="text-[11px] text-muted-foreground mt-3 font-medium flex items-center gap-1">
                {stat.trend}
              </p>
              <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110 opacity-50" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-primary text-primary-foreground shadow-2xl shadow-primary/20 rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
            <Building2 className="h-48 w-48 -mr-16 -mt-16" />
          </div>
          <CardHeader className="relative z-10 border-b border-white/10 pb-6 px-8 pt-8">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold font-heading tracking-tight">Featured: Neyan's Place</CardTitle>
                <CardDescription className="text-primary-foreground/70 text-sm mt-1">Kansas City Neighborhood Redevelopment Project</CardDescription>
              </div>
              <span className="px-3 py-1.5 bg-accent/20 text-accent text-[10px] font-bold rounded-md uppercase tracking-widest font-heading border border-accent/20">
                Community Impact
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-8 p-8 relative z-10">
            <div className="flex-1 space-y-6">
              <p className="text-primary-foreground/90 leading-relaxed font-medium">
                Coach Johnson Realty is proud to lead the reinvestment in our community through <strong>Neyan's Place</strong>. This project transformed a historic, fire-damaged six-plex into high-quality housing, rooting local investment back into the neighborhood.
              </p>
              <div className="flex gap-4">
                <div className="p-4 bg-background/10 rounded-2xl border border-white/10 flex-1 backdrop-blur-sm">
                  <p className="text-3xl font-bold text-accent font-heading">6</p>
                  <p className="text-[10px] text-primary-foreground/70 uppercase font-bold tracking-widest mt-1 font-heading">New Units</p>
                </div>
                <div className="p-4 bg-background/10 rounded-2xl border border-white/10 flex-1 backdrop-blur-sm">
                  <p className="text-3xl font-bold text-accent font-heading">100%</p>
                  <p className="text-[10px] text-primary-foreground/70 uppercase font-bold tracking-widest mt-1 font-heading">Occupied</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm rounded-3xl flex flex-col justify-center items-center text-center p-8 space-y-6 border-dashed group hover:border-primary/50 transition-all">
          <div className="p-5 bg-secondary rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <Megaphone className="w-8 h-8 inherit-color" />
          </div>
          <div>
            <p className="font-bold font-heading text-lg">Broadcast Update</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto font-medium">Share project milestones or alerts with all tenants instantly.</p>
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl py-6 transition-all shadow-lg shadow-primary/20 premium-button font-heading">
            Create Announcement
          </Button>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
            <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-5 p-6 hover:bg-secondary/30 transition-colors group cursor-pointer">
                  <div className="h-2 w-2 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm font-heading">Rent payment received</p>
                    <p className="text-muted-foreground text-[11px] mt-1 font-medium">Tenant John Doe paid $1,200 for Unit A1</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">2h ago</p>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest transition-all border-t border-border">
              View All Activity
            </button>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
            <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Lease Expirations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors group">
                  <div>
                    <p className="font-bold text-foreground text-sm font-heading">Unit B4 • Sarah Smith</p>
                    <p className="text-accent text-[11px] mt-1 font-bold uppercase tracking-widest font-heading">Expires in 30 days</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-border hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-widest h-10 transition-all font-heading">
                    Renew
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
