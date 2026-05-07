"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Search, Image as ImageIcon, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export default function AdminProperties() {
  const [properties, setProperties] = useState([
    { 
      id: "1", 
      name: "Neyan's Place", 
      address: "2411 E 10th St, Kansas City, MO", 
      type: "Six-plex", 
      units: 6, 
      status: "Active",
      description: "Historic six-plex redevelopment. Quality community housing.",
      photo: "/neyans_place_building.png"
    },
    { 
      id: "2", 
      name: "Oakwood Apartments", 
      address: "123 Main St, Kansas City, MO", 
      type: "Apartment", 
      units: 24, 
      status: "Active",
      description: "Luxury apartments in downtown KC.",
      photo: null 
    },
    { 
      id: "3", 
      name: "Sunset Duplex", 
      address: "456 Oak Ave, Kansas City, MO", 
      type: "Duplex", 
      units: 2, 
      status: "Active",
      description: "Quiet residential duplex with gardens.",
      photo: null 
    },
  ])

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage your real estate portfolio and community projects.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl shadow-primary/20 transition-all premium-button font-heading">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-border bg-card p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-bold font-heading">Add New Property</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-2">
                Create a new property profile with full details and photos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Property Name</Label>
                  <Input id="name" placeholder="e.g. Neyan's Place" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Property Type</Label>
                  <Input id="type" placeholder="e.g. Multi-Family" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Full Address</Label>
                <Input id="address" placeholder="123 Street St, Kansas City, MO" className="h-12 rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Description</Label>
                <Textarea id="description" placeholder="Describe the property, history, and importance..." className="min-h-[100px] rounded-xl bg-secondary/50 border-transparent focus:border-primary transition-all font-medium p-4" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Property Photos</Label>
                <div className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-all bg-secondary/30">
                  <ImageIcon className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-bold font-heading">Click to upload photos</p>
                  <p className="text-[10px] uppercase tracking-widest mt-2 font-medium opacity-70">PNG, JPG up to 10MB each</p>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-8">
              <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest font-heading transition-all shadow-lg shadow-primary/20">
                Save Property
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm font-medium" placeholder="Search portfolio..." />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[350px] font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Property</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Address</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Type</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Units</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border">
                      {property.photo ? (
                        <img src={property.photo} alt={property.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground font-heading">{property.name}</span>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[200px] font-medium">{property.description}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground font-medium py-4">{property.address}</TableCell>
                <TableCell className="text-sm font-bold text-foreground py-4">{property.type}</TableCell>
                <TableCell className="font-bold font-heading tabular-nums py-4">{property.units}</TableCell>
                <TableCell className="py-4">
                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-transparent font-bold text-[10px] uppercase tracking-widest">
                    {property.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right py-4">
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
