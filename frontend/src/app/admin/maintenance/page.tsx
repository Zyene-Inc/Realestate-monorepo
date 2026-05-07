"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Filter, AlertTriangle, CheckCircle2, Clock, FileDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function AdminMaintenance() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const data = await api.get("/admin/maintenance")
      setRequests(data)
    } catch (error: any) {
      toast.error("Failed to fetch maintenance requests")
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/maintenance/${id}`, { status })
      toast.success("Status updated")
      fetchRequests()
    } catch (error: any) {
      toast.error("Failed to update status")
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
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Maintenance</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage and track property service requests.</p>
        </div>
        
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl border-border bg-card shadow-sm text-[10px] font-bold uppercase tracking-widest font-heading hover:bg-secondary transition-all gap-2 h-14 px-6">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all font-heading group">
            <FileDown className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform text-accent" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-all font-medium" placeholder="Search requests..." />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Request Details</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Tenant/Unit</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Priority</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Submitted</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium italic uppercase tracking-widest text-[10px] font-heading">No active requests found.</TableCell>
              </TableRow>
            ) : requests.map((req: any) => (
              <TableRow key={req.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="py-4">
                  <Badge 
                    className={cn(
                      "font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-md border-transparent",
                      req.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                      req.status === 'in_progress' ? 'bg-accent/10 text-accent' :
                      'bg-primary text-primary-foreground'
                    )}
                  >
                    {req.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground font-heading">{req.category}</span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-1 line-clamp-1 max-w-[200px]">{req.description}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground font-heading">{req.tenant.firstName} {req.tenant.lastName}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 font-heading">Unit {req.unit.unitNumber}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-2">
                    {req.priority === 'emergency' ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : req.priority === 'high' ? (
                      <Clock className="w-4 h-4 text-accent" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest font-heading",
                      req.priority === 'emergency' ? 'text-destructive' : req.priority === 'high' ? 'text-accent' : 'text-muted-foreground'
                    )}>
                      {req.priority}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">
                  {format(new Date(req.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="py-4 text-right">
                  <select 
                    className="text-[10px] font-bold uppercase tracking-widest bg-secondary text-foreground border-transparent rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary font-heading cursor-pointer hover:bg-secondary/80 transition-colors"
                    value={req.status}
                    onChange={(e) => updateStatus(req.id, e.target.value)}
                  >
                    <option value="submitted">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
