"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Loader2, DollarSign, Calendar, ArrowUpRight, ReceiptText } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/errors"

type Payment = { id: string; status: string; totalAmount: number; paidAt?: string | null; dueDate: string; paymentMethod?: string | null }

export default function TenantPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/payments/my").then((data: Payment[]) => setPayments(data)).catch((error: unknown) => toast.error(getErrorMessage(error, "Unable to load payment history"))).finally(() => setLoading(false))
  }, [])

  const totalPaid = payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + payment.totalAmount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">Payment History</h1>
          <p className="text-muted-foreground mt-2 font-medium">Review your past transactions and download receipts.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/tenant/pay-rent" />}>
          Make a Payment <ArrowUpRight className="h-4 w-4 text-accent" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-none bg-primary text-primary-foreground  rounded-[1.25rem] group">
          <div className="absolute -right-4 -top-4 p-3 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <DollarSign className="h-32 w-32" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 font-heading">Total Paid (YTD)</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl tabular-nums">${totalPaid.toLocaleString()}</div>
            <p className="text-xs mt-3 opacity-80 font-medium">All completed transactions this year</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
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
              ) : payments.map((p) => (
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
                    <Button variant="ghost" size="icon" aria-label={`Open receipt ${p.id.slice(-8)}`}>
                      <ReceiptText className="h-4 w-4" />
                    </Button>
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
