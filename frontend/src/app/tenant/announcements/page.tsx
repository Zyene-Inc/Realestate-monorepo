"use client"

import { Card } from "@/components/ui/card"
import { Megaphone, Calendar, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

const announcements = [
  { id: 1, title: "Filter change schedule", date: "April 28, 2026", category: "Maintenance", content: "The maintenance team will conduct quarterly air filter changes for all units starting tomorrow at 9:00 AM.", isNew: true },
  { id: 2, title: "Spring courtyard gathering", date: "May 15, 2026", category: "Event", content: "Join neighbors for a spring gathering in the courtyard. Food and drinks will be provided for residents.", isNew: false },
  { id: 3, title: "Package locker update", date: "April 20, 2026", category: "General", content: "Common area improvements are nearly complete. The secure package lockers are expected to open next Monday.", isNew: false },
]

export default function TenantAnnouncements() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Announcements</h1>
          <p className="text-muted-foreground mt-2 font-medium">Latest updates from Coach Johnson Realty.</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest border border-accent/20">
          <Bell className="h-4 w-4" />
          {announcements.filter(a => a.isNew).length} New Updates
        </div>
      </div>

      <div className="grid gap-5">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="border-border bg-card">
            <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      announcement.isNew ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                    )}>
                      <Megaphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{announcement.title}</h3>
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
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full font-heading">
                      New update
                    </span>
                  )}
                </div>
                
                <p className="mt-5 text-sm leading-6 text-foreground/80">
                  {announcement.content}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Posted by the property team</span>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-heading">Post ID: #ANN-{announcement.id}42</span>
                </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
