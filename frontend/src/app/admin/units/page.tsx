"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Building2, Filter } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function AdminUnits() {
  const [units] = useState([
    { id: "1", property: "Brookside Court", unitNumber: "1A", bedrooms: 2, bathrooms: 1, rent: 1200, status: "Occupied", tenant: "Marcus Bell" },
    { id: "2", property: "Brookside Court", unitNumber: "1B", bedrooms: 1, bathrooms: 1, rent: 950, status: "Vacant", tenant: null },
    { id: "3", property: "Juniper Row", unitNumber: "204", bedrooms: 2, bathrooms: 2, rent: 1450, status: "Occupied", tenant: "Elena Torres" },
    { id: "4", property: "Juniper Row", unitNumber: "305", bedrooms: 3, bathrooms: 2, rent: 1800, status: "Maintenance", tenant: null },
  ])

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Units</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage individual units across your portfolio.</p>
        </div>
        
        <Dialog>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl  transition-[background-color,color,border-color,box-shadow,transform,opacity] font-heading" />
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-border bg-card p-5 sm:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-bold font-heading">Add New Unit</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-2">Assign a new unit to an existing property.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-2">
              <div className="space-y-2">
                <Label htmlFor="unit-property" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Select property</Label>
                <Select>
                  <SelectTrigger id="unit-property" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:ring-primary/20 transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    <SelectItem value="neyans">Brookside Court</SelectItem>
                    <SelectItem value="oakwood">Juniper Row</SelectItem>
                    <SelectItem value="sunset">Benton Duplex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="unitNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Unit Number</Label>
                  <Input id="unitNumber" placeholder="e.g. 101" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rent" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Monthly Rent</Label>
                  <Input id="rent" type="number" placeholder="$0.00" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium tabular-nums" />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Bedrooms</Label>
                  <Input id="bedrooms" type="number" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Bathrooms</Label>
                  <Input id="bathrooms" type="number" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-8">
              <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity] shadow-lg shadow-primary/20">
                Create Unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm font-medium" placeholder="Search units, properties, or tenants" />
        </div>
        <Button variant="outline" className="h-12 px-6 rounded-2xl border-border bg-card shadow-sm text-[10px] font-bold uppercase tracking-widest font-heading hover:bg-secondary transition-[background-color,color,border-color,box-shadow,transform,opacity] gap-2">
          <Filter className="w-4 h-4" />
          Filter Options
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Unit</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Property</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Layout</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Rent</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Tenant</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="font-bold text-foreground font-heading py-4">{unit.unitNumber}</TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{unit.property}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-medium py-4">{unit.bedrooms}B / {unit.bathrooms}Ba</TableCell>
                <TableCell className="font-bold text-accent font-heading tabular-nums py-4">${unit.rent}</TableCell>
                <TableCell className="py-4">
                  <Badge 
                    className={cn(
                      "font-bold text-[10px] uppercase tracking-widest border-transparent",
                      unit.status === "Occupied" ? "bg-success/10 text-success hover:bg-success/20" :
                      unit.status === "Vacant" ? "bg-accent/10 text-accent hover:bg-accent/20" :
                      "bg-warning/10 text-warning hover:bg-warning/20"
                    )}
                  >
                    {unit.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-medium py-4">{unit.tenant || "Not assigned"}</TableCell>
                <TableCell className="text-right py-4">
                  <Button variant="outline" size="sm" className="rounded-lg border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity]">Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
