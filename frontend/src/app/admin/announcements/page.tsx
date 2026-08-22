"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Megaphone, Clock, Building2 } from "lucide-react"

const announcements = [
  { id: "1", title: "Monthly HVAC Filter Change", content: "Our maintenance crew will be visiting all units next Tuesday to replace air filters.", date: "Today, 9:00 AM", target: "All Properties" },
  { id: "2", title: "Parking Lot Maintenance", content: "The north parking lot will be closed for repaving on Saturday.", date: "Yesterday, 2:30 PM", target: "Juniper Row" },
]

export default function AdminAnnouncements() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Announcements</h1>
          <p className="text-muted-foreground mt-2 font-medium">Broadcast important updates to your tenants.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl  transition-[background-color,color,border-color,box-shadow,transform,opacity] font-heading group">
          <Plus className="mr-2 h-4 w-4 text-current transition-transform group-hover:rotate-90" />
          Create Broadcast
        </Button>
      </div>

      <div className="grid gap-6">
        {announcements.map((ann) => (
          <Card key={ann.id} className="border-border bg-card shadow-sm hover:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] rounded-[1.25rem] overflow-hidden group">
            <CardHeader className="bg-secondary/30 border-b border-border py-5 px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform duration-500">
                    <Megaphone className="w-5 h-5 text-accent" />
                  </div>
                  <CardTitle className="text-xl font-bold font-heading">{ann.title}</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading shadow-sm">
                    <Building2 className="w-3 h-3 text-primary" /> {ann.target}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading shadow-sm">
                    <Clock className="w-3 h-3 text-primary" /> {ann.date}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex gap-6">
                <div className="w-1 bg-border rounded-full flex-shrink-0" />
                <p className="text-muted-foreground font-medium text-base leading-relaxed max-w-4xl">{ann.content}</p>
              </div>
              <div className="mt-8 flex gap-3">
                <Button variant="outline" className="rounded-xl border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity] px-6">Edit Broadcast</Button>
                <Button variant="outline" className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[10px] font-bold uppercase tracking-widest font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity] px-6">Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
