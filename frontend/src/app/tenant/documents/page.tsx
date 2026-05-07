"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, ShieldCheck, FileSearch, ArrowRight } from "lucide-react"

export default function TenantDocuments() {
  const documents = [
    { id: "1", name: "Residential Lease Agreement 2026.pdf", type: "Lease", date: "Jan 01, 2026", icon: FileText },
    { id: "2", name: "Move-In Inspection Report.pdf", type: "Inspection", date: "Jan 02, 2026", icon: FileSearch },
    { id: "3", name: "Community Rules & Regulations.pdf", type: "Community", date: "Jan 01, 2026", icon: ShieldCheck },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-2 font-medium">Access your lease, inspections, and other important files.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {documents.map((doc) => (
          <Card key={doc.id} className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 w-full">
                <div className="p-4 bg-secondary rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <doc.icon className="w-6 h-6 inherit-color" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg font-heading text-foreground tracking-tight">{doc.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] uppercase font-bold text-accent tracking-widest font-heading bg-accent/10 px-2.5 py-1 rounded-md">{doc.type}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Uploaded {doc.date}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full sm:w-auto rounded-xl border-border hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-widest h-12 px-8 transition-all font-heading whitespace-nowrap">
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
