"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, Download, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const payments = [
  { id: "1", tenant: "Marcus Bell", unit: "A1", amount: 1200, fee: 5, total: 1205, status: "Paid", date: "2026-04-01", method: "ACH" },
  { id: "2", tenant: "Elena Torres", unit: "B4", amount: 1200, fee: 35.10, total: 1235.10, status: "Paid", date: "2026-04-02", method: "Card" },
  { id: "3", tenant: "Andre Lewis", unit: "1", amount: 1200, fee: 0, total: 1200, status: "Overdue", date: "2026-04-01", method: "-" },
]

export default function AdminPayments() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Payments</h1>
          <p className="text-muted-foreground mt-2 font-medium">Track rent collection and processing fees.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-8 py-6 rounded-2xl  transition-[background-color,color,border-color,box-shadow,transform,opacity] font-heading group">
          <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform text-accent" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] rounded-[1.25rem] group relative overflow-hidden">
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Total Collected (April)</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold text-foreground font-heading tabular-nums">$142,500.00</div>
            <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-green-600 mt-3 font-heading">
              <TrendingUp className="w-3 h-3 mr-1" /> +4% from last month
            </div>
            <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12 transition-[background-color,color,border-color,box-shadow,transform,opacity] group-hover:scale-110" />
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] rounded-[1.25rem] group relative overflow-hidden">
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold text-destructive font-heading tabular-nums">$12,400.00</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3 font-heading">10 tenants overdue</p>
            <div className="absolute right-0 top-0 w-24 h-24 bg-destructive/10 rounded-full -mr-12 -mt-12 transition-[background-color,color,border-color,box-shadow,transform,opacity] group-hover:scale-110" />
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-[background-color,color,border-color,box-shadow,transform,opacity] rounded-[1.25rem] group relative overflow-hidden">
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Fees Collected</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold text-foreground font-heading tabular-nums">$1,840.00</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3 font-heading">Total processing fees</p>
            <div className="absolute right-0 top-0 w-24 h-24 bg-accent/10 rounded-full -mr-12 -mt-12 transition-[background-color,color,border-color,box-shadow,transform,opacity] group-hover:scale-110" />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium" placeholder="Search payments" />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Tenant & Unit</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Rent Amount</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Fee</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Total Paid</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Method</TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id} className="hover:bg-secondary/30 transition-colors border-border">
                <TableCell className="py-4">
                  <div className="font-bold text-foreground font-heading">{p.tenant}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 font-heading">Unit {p.unit}</div>
                </TableCell>
                <TableCell className="py-4 font-medium tabular-nums">${p.amount.toFixed(2)}</TableCell>
                <TableCell className="py-4 font-medium text-muted-foreground tabular-nums">${p.fee.toFixed(2)}</TableCell>
                <TableCell className="py-4 font-bold text-foreground font-heading tabular-nums">${p.total.toFixed(2)}</TableCell>
                <TableCell className="py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest">{p.method}</TableCell>
                <TableCell className="py-4">
                  <Badge 
                    className={cn(
                      "font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-md border-transparent",
                      p.status === 'Paid' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    )}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-right">
                  <Button variant="outline" size="sm" className="rounded-lg border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest font-heading transition-[background-color,color,border-color,box-shadow,transform,opacity]">PDF</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
