"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone, Calendar, ArrowRight, Bell } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

export default function TenantAnnouncements() {
  const { user } = useAuth()
  
  const announcements = [
    {
      id: 1,
      title: "Filter Change Schedule",
      date: "April 28, 2026",
      category: "Maintenance",
      content: "The maintenance team will be conducting quarterly air filter changes for all units starting tomorrow at 9:00 AM.",
      isNew: true
    },
    {
      id: 2,
      title: "Community Resident Event",
      date: "May 15, 2026",
      category: "Event",
      content: "Join us for our annual spring community event in the courtyard! Food and drinks will be provided for all residents.",
      isNew: false
    },
    {
      id: 3,
      title: "Property Enhancement Update",
      date: "April 20, 2026",
      category: "General",
      content: "Common area enhancements are 80% complete. We expect the new secure package lockers to be operational by next Monday.",
      isNew: false
    }
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Announcements</h1>
          <p className="text-muted-foreground mt-2 font-medium">Latest updates from Coach Johnson Realty.</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest border border-accent/20">
          <Bell className="h-4 w-4" />
          {announcements.filter(a => a.isNew).length} New Updates
        </div>
      </div>

      <div className="grid gap-8">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
            <div className="flex flex-col md:flex-row">
              <div className={cn(
                "w-full md:w-2 transition-colors",
                announcement.isNew ? "bg-accent" : "bg-primary"
              )} />
              <div className="flex-1 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300",
                      announcement.isNew ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                    )}>
                      <Megaphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground font-heading tracking-tight">{announcement.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-heading">
                          <Calendar className="h-3 w-3" /> {announcement.date}
                        </span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-2.5 py-1 bg-primary/10 rounded-md">
                          {announcement.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  {announcement.isNew && (
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full animate-pulse font-heading">
                      New Update
                    </span>
                  )}
                </div>
                
                <p className="text-foreground/80 leading-relaxed font-medium mb-8">
                  {announcement.content}
                </p>

                <div className="pt-6 border-t border-border flex items-center justify-between">
                  <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-accent transition-colors group/btn font-heading">
                    View Full Details
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-heading">Post ID: #ANN-{announcement.id}42</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
