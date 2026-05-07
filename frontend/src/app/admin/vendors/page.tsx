"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Star, Wrench } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminVendors() {
  const vendors = [
    { id: "1", name: "QuickFix Plumbing", company: "QuickFix LLC", specialty: "Plumbing", rating: 4.8, phone: "555-0101" },
    { id: "2", name: "Sparky Electrical", company: "Sparky & Co", specialty: "Electrical", rating: 4.5, phone: "555-0202" },
    { id: "3", name: "CoolAir HVAC", company: "CoolAir Systems", specialty: "HVAC", rating: 4.9, phone: "555-0303" },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Vendors</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage your network of external service providers.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl shadow-primary/20 transition-all premium-button font-heading group">
          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform text-accent" />
          Add Vendor
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-all font-medium" placeholder="Search vendors by name or specialty..." />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Vendor Info</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Specialty</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Rating</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Phone</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground font-heading">{vendor.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 font-heading">{vendor.company}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-transparent font-bold uppercase tracking-widest text-[9px] px-3 py-1">
                    {vendor.specialty}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-1.5 bg-secondary/50 w-fit px-2 py-1 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                    <span className="font-bold text-foreground font-heading text-xs">{vendor.rating}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 font-bold text-muted-foreground tabular-nums">{vendor.phone}</TableCell>
                <TableCell className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest font-heading transition-all">View</Button>
                    <Button variant="outline" size="sm" className="rounded-lg border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest font-heading transition-all">Edit</Button>
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
