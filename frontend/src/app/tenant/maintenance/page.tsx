"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle, ArrowRight, Camera, Loader2, Calendar } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export default function TenantMaintenance() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    category: "",
    priority: "low",
    description: "",
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const data = await api.get("/tenant/portal/maintenance")
      setRequests(data)
    } catch (error: any) {
      toast.error("Failed to load requests")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post("/tenant/portal/maintenance", formData)
      toast.success("Request submitted successfully")
      setOpen(false)
      setFormData({ category: "", priority: "low", description: "" })
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request")
    } finally {
      setSubmitting(false)
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
          <h1 className="text-4xl font-bold text-foreground font-heading tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground mt-2 font-medium">Report property issues and track real-time repair status.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl shadow-primary/20 group transition-all premium-button font-heading">
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform text-accent" />
                New Service Request
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px] rounded-3xl border-border bg-card p-8 shadow-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-heading tracking-tight">New Service Request</DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">Describe the issue in detail so we can assign the right specialist.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading ml-1">Category</Label>
                  <select 
                    className="w-full h-12 rounded-xl border border-border bg-secondary/50 px-4 focus:ring-2 focus:ring-primary/5 outline-none font-medium transition-all"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select category...</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="appliance">Appliance</option>
                    <option value="pest">Pest Control</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading ml-1">Priority Level</Label>
                  <select 
                    className="w-full h-12 rounded-xl border border-border bg-secondary/50 px-4 focus:ring-2 focus:ring-primary/5 outline-none font-medium transition-all"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="low">Low - General Maintenance</option>
                    <option value="medium">Medium - Needs Attention</option>
                    <option value="high">High - Urgent Issue</option>
                    <option value="emergency">Emergency - Critical Service</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading ml-1">Issue Description</Label>
                  <Textarea 
                    placeholder="Provide a detailed description of the problem..." 
                    className="rounded-xl border-border bg-secondary/50 min-h-[120px] p-4 focus-visible:ring-primary/10" 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all premium-button font-heading"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6">
            {requests.length === 0 ? (
              <Card className="border-2 border-dashed border-border bg-card/50 rounded-3xl p-16 text-center">
                <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs font-heading">No active maintenance records</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Your property history will appear here.</p>
              </Card>
            ) : requests.map((req: any) => (
              <Card key={req.id} className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
                <div className="flex flex-col md:flex-row">
                  <div className={cn(
                    "w-full md:w-2 transition-colors",
                    req.status === 'completed' ? 'bg-green-500' : 'bg-accent'
                  )} />
                  <CardContent className="p-8 flex-1">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex gap-6">
                        <div className={cn(
                          "p-4 rounded-2xl h-fit transition-all duration-300",
                          req.status === 'completed' ? 'bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        )}>
                          <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-xl text-foreground font-heading tracking-tight capitalize">{req.category}</h3>
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-md",
                              req.priority === 'emergency' || req.priority === 'high' ? 'bg-red-500/10 text-red-600' : 'bg-secondary text-muted-foreground'
                            )}>
                              {req.priority} Priority
                            </span>
                          </div>
                          <p className="text-muted-foreground font-medium leading-relaxed max-w-md italic">"{req.description}"</p>
                          <div className="flex items-center gap-6 mt-6">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-heading">
                              <Calendar className="h-3.5 w-3.5" /> {format(new Date(req.createdAt), 'MMM dd, yyyy')}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-heading">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ID: REQ-{req.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-4 min-w-[150px]">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          req.status === 'completed' ? 'bg-green-500/10 text-green-700' : 'bg-accent/10 text-accent'
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            req.status === 'completed' ? 'bg-green-600' : 'bg-accent animate-pulse'
                          )} />
                          {req.status}
                        </span>
                        <Button variant="outline" className="w-full rounded-xl border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest h-11 group/btn font-heading transition-all">
                          Manage Request
                          <ArrowRight className="ml-2 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Support Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex gap-4 group">
                <div className="p-3 bg-secondary rounded-xl h-fit group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Camera className="h-5 w-5 text-muted-foreground inherit-color" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-1 font-heading">Photo Documentation</p>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Always attach clear photos to help our technicians prepare before arrival.</p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="p-3 bg-secondary rounded-xl h-fit group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <AlertCircle className="h-5 w-5 text-muted-foreground inherit-color" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-1 font-heading">Emergency Protocol</p>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Major leaks, electrical hazards, or lockouts are prioritized immediately.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-10 bg-primary rounded-[2.5rem] text-primary-foreground shadow-2xl shadow-primary/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
              <Wrench className="h-40 w-40 -mr-10 -mt-10" />
            </div>
            <h4 className="font-bold font-heading text-2xl mb-4 relative z-10">Critical Emergency?</h4>
            <p className="text-[11px] text-primary-foreground/70 font-medium uppercase tracking-[0.1em] leading-relaxed mb-8 relative z-10">
              If you have a life-safety emergency or major property damage, contact our 24/7 priority line.
            </p>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs uppercase tracking-widest py-7 rounded-2xl transition-all shadow-lg shadow-black/20 premium-button font-heading relative z-10">
              Connect to Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
