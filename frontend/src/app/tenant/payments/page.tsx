"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  CreditCard,
  DollarSign,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type Payment = {
  id: string;
  status: string;
  rentAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paidAt?: string | null;
  dueDate: string;
  paymentMethod?: string | null;
};

const receiptStatuses = new Set(["PAID", "PARTIAL", "WAIVED", "REFUNDED"]);

export default function TenantPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/payments/my")
      .then((data: Payment[]) => setPayments(data))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load payment history")),
      )
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return payments
      .filter(
        (payment) =>
          payment.paidAt && new Date(payment.paidAt).getFullYear() === currentYear,
      )
      .reduce((sum, payment) => sum + payment.paidAmount, 0);
  }, [payments]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Payment history
          </h1>
          <p className="mt-2 font-medium text-muted-foreground">
            Review rent charges, payments received, balances, and printable receipts.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/tenant/pay-rent" />}>
          Make a payment <ArrowUpRight aria-hidden="true" />
        </Button>
      </div>

      <Card className="relative max-w-sm overflow-hidden border-none bg-primary text-primary-foreground">
        <div className="absolute -right-4 -top-4 p-3 opacity-10">
          <DollarSign className="size-32" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 font-heading">
            Total received this year
          </CardTitle>
          <CreditCard className="size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-[-0.04em] tabular-nums sm:text-4xl">
            ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-3 text-xs font-medium opacity-80">
            Payments recorded by Coach Johnson Realty
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.25rem] border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Description</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Received / balance</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No payment history found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id} className="border-border hover:bg-secondary/30">
                    <TableCell className="py-5">
                      <p className="font-semibold">Rent payment</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Due {format(new Date(payment.dueDate), "MMM d, yyyy")}
                      </p>
                    </TableCell>
                    <TableCell className="py-5">
                      <p className="font-semibold tabular-nums">
                        ${payment.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rent ${payment.rentAmount.toFixed(2)} · Fee ${payment.lateFee.toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell className="py-5">
                      <p className="font-semibold tabular-nums">
                        ${payment.paidAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance ${payment.balanceDue.toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell className="py-5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="size-3" />
                        {format(
                          new Date(payment.paidAt || payment.dueDate),
                          "MMM d, yyyy",
                        )}
                      </span>
                      <p className="mt-1 text-xs uppercase">{payment.paymentMethod || "Not paid"}</p>
                    </TableCell>
                    <TableCell className="py-5">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em]",
                          payment.status === "PAID"
                            ? "bg-success/10 text-success"
                            : payment.status === "OVERDUE"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning",
                        )}
                      >
                        {payment.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-5 text-right">
                      {receiptStatuses.has(payment.status) ? (
                        <Button
                          nativeButton={false}
                          size="icon"
                          variant="ghost"
                          aria-label={`Open receipt ${payment.id.slice(-8)}`}
                          render={<Link href={`/tenant/payments/${payment.id}/receipt`} />}
                        >
                          <ReceiptText aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Available after payment</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
