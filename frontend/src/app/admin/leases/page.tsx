"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Calendar, Loader2, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function AdminLeases() {
  const [leases, setLeases] = useState([])
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    tenantId: "",
    unitId: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [leasesData, tenantsData, unitsData] = await Promise.all([
        api.get("/admin/leases"),
        api.get("/admin/tenants"),
        api.get("/admin/units"),
      ])
      setLeases(leasesData)
      setTenants(tenantsData)
      setUnits(unitsData)
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post("/admin/leases", {
        ...formData,
        monthlyRent: parseFloat(formData.monthlyRent),
        securityDeposit: parseFloat(formData.securityDeposit),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      })
      toast.success("Lease created successfully")
      setOpen(false)
      fetchData() // Refresh list
    } catch (error: any) {
      toast.error("Failed to create lease: " + error.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Leases</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage lease agreements and contract terms.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl shadow-primary/20 transition-all premium-button font-heading group" />
            }
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform text-accent" />
            Create Lease
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-border bg-card p-8">
            <form onSubmit={handleCreateLease}>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-3xl font-bold font-heading">Create New Lease</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium mt-2">Define terms for a new tenant agreement.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Select Tenant</Label>
                  <select 
                    className="w-full h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-1 focus:ring-primary px-4 outline-none font-medium text-foreground transition-all"
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    required
                  >
                    <option value="">Choose a tenant...</option>
                    {tenants.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Select Unit</Label>
                  <select 
                    className="w-full h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-1 focus:ring-primary px-4 outline-none font-medium text-foreground transition-all"
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    required
                  >
                    <option value="">Choose a unit...</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>Unit {u.unitNumber} - {u.property.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Start Date</Label>
                    <Input 
                      type="date" 
                      className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" 
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">End Date</Label>
                    <Input 
                      type="date" 
                      className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" 
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Monthly Rent</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium tabular-nums" 
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Security Deposit</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium tabular-nums" 
                      value={formData.securityDeposit}
                      onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-8">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all font-heading"
                  disabled={creating}
                >
                  {creating ? "Processing..." : "Sign & Create Lease"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-all font-medium" placeholder="Search leases..." />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Tenant</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Property/Unit</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Term</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Rent</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium uppercase tracking-widest text-[10px] font-heading">No leases found.</TableCell>
              </TableRow>
            ) : leases.map((lease: any) => (
              <TableRow key={lease.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="py-4 font-bold text-foreground font-heading">
                  {lease.tenant.firstName} {lease.tenant.lastName}
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{lease.unit.property.name}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 font-heading">Unit {lease.unit.unitNumber}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">
                    <Calendar className="w-4 h-4 text-accent" />
                    {format(new Date(lease.startDate), 'MMM dd, yyyy')} - {format(new Date(lease.endDate), 'MMM dd, yyyy')}
                  </div>
                </TableCell>
                <TableCell className="py-4 font-bold text-foreground font-heading text-lg tabular-nums">${lease.monthlyRent.toLocaleString()}</TableCell>
                <TableCell className="py-4">
                  <Badge 
                    className={cn(
                      "font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-md border-transparent",
                      lease.status === "active" ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {lease.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground font-heading transition-all">View File</Button>
                    <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent hover:bg-accent/10 font-heading transition-all">Renew</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
