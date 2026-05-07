"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Loader2, DollarSign, Calendar, ArrowUpRight, ReceiptText } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function TenantPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const data = await api.get("/payments/my")
      setPayments(data)
    } catch (error: any) {
      toast.error("Failed to load payment history")
    } finally {
      setLoading(false)
    }
  }

  const totalPaid = payments
    .filter((p: any) => p.status === 'PAID')
    .reduce((sum, p: any) => sum + p.totalAmount, 0)

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
          <h1 className="text-4xl font-bold text-foreground font-heading tracking-tight">Payment History</h1>
          <p className="text-muted-foreground mt-2 font-medium">Review your past transactions and download receipts.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all premium-button font-heading flex items-center gap-2">
          Make a Payment <ArrowUpRight className="h-4 w-4 text-accent" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-none bg-primary text-primary-foreground shadow-2xl shadow-primary/20 rounded-3xl group">
          <div className="absolute -right-4 -top-4 p-3 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <DollarSign className="h-32 w-32" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 font-heading">Total Paid (YTD)</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-heading tabular-nums">${totalPaid.toLocaleString()}</div>
            <p className="text-xs mt-3 opacity-80 font-medium">All completed transactions this year</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground py-5">Description</TableHead>
                <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground py-5">Amount</TableHead>
                <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground py-5">Date</TableHead>
                <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground py-5">Method</TableHead>
                <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground py-5">Status</TableHead>
                <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-muted-foreground py-5 text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                    No payment history found.
                  </TableCell>
                </TableRow>
              ) : payments.map((p: any) => (
                <TableRow key={p.id} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell className="py-5">
                    <span className="font-bold text-foreground font-heading">Rent Payment</span>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">ID: {p.id.slice(-8)}</p>
                  </TableCell>
                  <TableCell className="font-bold text-foreground font-heading tabular-nums py-5">${p.totalAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-medium py-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {p.paidAt ? format(new Date(p.paidAt), 'MMM dd, yyyy') : format(new Date(p.dueDate), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-5">
                    {p.paymentMethod || 'BANK TRANSFER'}
                  </TableCell>
                  <TableCell className="py-5">
                    <div className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.15em]",
                      p.status === 'PAID' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                    )}>
                      {p.status}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-5">
                    <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-center">
                      <ReceiptText className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
