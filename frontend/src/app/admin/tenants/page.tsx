"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Mail, Loader2, UserPlus, MoreHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { toast } from "sonner"
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
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function AdminTenants() {
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [inviting, setInviting] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    unitId: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tenantsData, unitsData] = await Promise.all([
        api.get("/admin/tenants"),
        api.get("/admin/units"),
      ])
      setTenants(tenantsData)
      setUnits(unitsData)
    } catch (error: any) {
      toast.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      await api.post("/auth/invite", formData)
      toast.success("Invitation sent successfully")
      setOpen(false)
      setFormData({ firstName: "", lastName: "", email: "", unitId: "" })
      fetchData()
    } catch (error: any) {
      toast.error("Failed to send invite")
    } finally {
      setInviting(false)
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
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Tenants</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage your tenant list and invites.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl shadow-primary/20 transition-all premium-button font-heading group" />
            }
          >
            <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform text-accent" />
            Invite Tenant
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-border bg-card p-8">
            <form onSubmit={handleInvite}>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-3xl font-bold font-heading">Invite Resident</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium mt-2">Send an invitation to a new resident.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-2">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">First Name</Label>
                    <Input 
                      className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Last Name</Label>
                    <Input 
                      className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Email Address</Label>
                  <Input 
                    type="email" 
                    className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Assign Unit</Label>
                  <select 
                    className="w-full h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary focus:ring-1 focus:ring-primary px-4 outline-none font-medium text-foreground transition-all"
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    required
                  >
                    <option value="">Select a unit...</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>Unit {u.unitNumber} - {u.property.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-8">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all font-heading"
                  disabled={inviting}
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm font-medium focus:border-primary transition-all" placeholder="Search tenants..." />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Resident</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Contact</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Unit Info</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium uppercase tracking-widest text-[10px] font-heading">No residents found.</TableCell>
              </TableRow>
            ) : tenants.map((tenant: any) => (
              <TableRow key={tenant.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground font-heading">{tenant.firstName} {tenant.lastName}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 font-heading">ID: #{tenant.id.slice(-6).toUpperCase()}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <Mail className="w-4 h-4 text-accent" />
                    {tenant.email}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-widest font-heading">{tenant.unit?.property?.name || 'Unassigned'}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 font-heading">Unit {tenant.unit?.unitNumber || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge className={cn(
                    "font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-md border-transparent",
                    tenant.status === 'active' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  )}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-right">
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-secondary transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
