"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Wrench, FileText, Megaphone, ArrowUpRight, CheckCircle2, Clock, Loader2, Calendar } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"

export default function TenantDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await api.get("/tenant/portal/dashboard")
      setData(res)
    } catch (error: any) {
      toast.error("Failed to load dashboard: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const activeLease = data?.leases?.[0]
  const rentDue = activeLease?.monthlyRent || 0
  const daysUntilRenewal = activeLease ? differenceInDays(new Date(activeLease.endDate), new Date()) : 0

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">
              {data?.unit ? `${data.unit.property.name} • Unit ${data.unit.unitNumber}` : "Property Overview"}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-foreground font-heading tracking-tight">
            Welcome back, <span className="text-primary">{data?.firstName || 'Resident'}</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium max-w-lg">
            Manage your lease, payments, and maintenance requests all in one premium portal.
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-secondary border border-border rounded-2xl shadow-sm">
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading leading-none">Status</p>
            <p className="text-sm font-bold text-foreground font-heading">Verified Account</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Rent Card */}
        <Card className="relative overflow-hidden border-none bg-primary text-primary-foreground shadow-2xl shadow-primary/20 rounded-3xl group">
          <div className="absolute -right-4 -top-4 p-3 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <CreditCard className="h-32 w-32" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 font-heading">Monthly Rent</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-heading tabular-nums">${rentDue.toLocaleString()}</div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                <Calendar className="h-3 w-3" /> Due {activeLease ? format(new Date(), 'MMMM') + ' 1st' : 'N/A'}
              </div>
              <button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 premium-button">
                Make Payment
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Card */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl group relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground font-heading">{data?.maintenanceRequests?.length || 0}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn(
                "flex h-2 w-2 rounded-full",
                data?.maintenanceRequests?.length > 0 ? "bg-accent animate-pulse" : "bg-green-500"
              )} />
              <p className="text-[11px] text-muted-foreground font-medium truncate max-w-[140px]">
                {data?.maintenanceRequests?.[0]?.description || 'No Active Requests'}
              </p>
            </div>
            <button className="mt-5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-accent transition-colors flex items-center gap-1">
              View History <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Lease Card */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Lease Remaining</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground font-heading">
              {daysUntilRenewal > 0 ? daysUntilRenewal : 0}
              <span className="text-sm font-medium text-muted-foreground ml-2">Days</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Until Lease Renewal</p>
            <div className="mt-4 w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full" 
                style={{ width: `${Math.min(100, (daysUntilRenewal / 365) * 100)}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Announcements Card */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Alerts</CardTitle>
            <Megaphone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground font-heading">0</div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Unread Announcements</p>
            <div className="mt-6 flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-7 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {i}
                </div>
              ))}
              <div className="h-7 w-7 rounded-full border-2 border-card bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                +0
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid gap-8 lg:grid-cols-7">
        {/* Payment History */}
        <Card className="lg:col-span-4 border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border py-6 px-8">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-foreground font-heading">Recent Payments</CardTitle>
            <button className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1">
              Statements <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data?.payments?.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium text-sm">No transaction records found.</p>
                </div>
              ) : data?.payments?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-6 hover:bg-secondary/30 transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm font-heading">Rent - {format(new Date(p.dueDate), 'MMMM yyyy')}</p>
                      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">
                        Ref: {p.id.slice(-8).toUpperCase()} • {p.paymentMethod || 'BANK TRANSFER'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-base font-heading tabular-nums">${p.totalAmount.toLocaleString()}</p>
                    <div className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] mt-2",
                      p.status === 'PAID' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                    )}>
                      {p.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {data?.payments?.length > 0 && (
              <button className="w-full py-4 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest transition-all border-t border-border">
                View All Transactions
              </button>
            )}
          </CardContent>
        </Card>

        {/* Recent Maintenance / Activity */}
        <Card className="lg:col-span-3 border-border bg-card shadow-sm rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-border py-6 px-8">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-foreground font-heading">Maintenance Updates</CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex-1 flex flex-col">
            <div className="space-y-6 flex-1">
              {data?.maintenanceRequests?.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-50">
                  <Wrench className="h-10 w-10 mb-4" />
                  <p className="text-sm font-medium">All systems normal</p>
                </div>
              ) : data?.maintenanceRequests?.slice(0, 2).map((req: any) => (
                <div key={req.id} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                      req.priority === 'high' || req.priority === 'emergency' ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
                    )}>
                      {req.priority} Priority
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      {format(new Date(req.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="p-5 bg-secondary/50 rounded-2xl border border-transparent group-hover:border-border transition-all">
                    <p className="text-foreground text-xs leading-relaxed font-medium line-clamp-2 italic">
                      "{req.description}"
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{req.status}</span>
                      </div>
                      <button className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:text-accent">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-8 w-full py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground text-[10px] font-bold uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all duration-300">
              Submit New Request
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
