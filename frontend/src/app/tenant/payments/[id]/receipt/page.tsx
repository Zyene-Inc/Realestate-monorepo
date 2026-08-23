"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { toast } from "sonner";

type ReceiptPayment = {
  id: string;
  status: string;
  rentAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  tenant: { firstName: string; lastName: string; email: string };
  lease: { id: string };
  unit: { unitNumber: string; property: { name: string; address?: string | null } };
};

export default function TenantPaymentReceipt() {
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = useState<ReceiptPayment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api
      .get(`/payments/my/${params.id}`)
      .then((value: ReceiptPayment) => setPayment(value))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load this receipt")),
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!payment) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-4 p-8">
          <h1 className="text-xl font-semibold">Receipt unavailable</h1>
          <p className="text-sm text-muted-foreground">
            The payment record could not be found in your resident account.
          </p>
          <Button nativeButton={false} variant="outline" render={<Link href="/tenant/payments" />}>
            <ArrowLeft aria-hidden="true" /> Back to payments
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button nativeButton={false} variant="outline" render={<Link href="/tenant/payments" />}>
          <ArrowLeft aria-hidden="true" /> Back to payments
        </Button>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Print or save as PDF
        </Button>
      </div>
      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="border-b border-border pb-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Coach Johnson Realty</p>
              <CardTitle className="mt-2 text-3xl">Rent payment receipt</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Payment ID {payment.id}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{payment.status}</p>
              <p className="mt-1 text-muted-foreground">
                {payment.paidAt
                  ? `Recorded ${format(new Date(payment.paidAt), "MMMM d, yyyy")}`
                  : `Due ${format(new Date(payment.dueDate), "MMMM d, yyyy")}`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-6 sm:p-8">
          <div className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium text-muted-foreground">Resident</p>
              <p className="mt-1 font-semibold">
                {payment.tenant.firstName} {payment.tenant.lastName}
              </p>
              <p className="text-muted-foreground">{payment.tenant.email}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Rental home</p>
              <p className="mt-1 font-semibold">{payment.unit.property.name}</p>
              <p className="text-muted-foreground">Unit {payment.unit.unitNumber}</p>
              {payment.unit.property.address ? (
                <p className="text-muted-foreground">{payment.unit.property.address}</p>
              ) : null}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-2 bg-secondary/45 px-4 py-3 text-sm font-semibold">
              <span>Payment detail</span>
              <span className="text-right">Amount</span>
            </div>
            <ReceiptRow label="Base rent" amount={payment.rentAmount} />
            <ReceiptRow label="Late fee" amount={payment.lateFee} />
            <ReceiptRow label="Total charge" amount={payment.totalAmount} emphasized />
            <ReceiptRow label="Amount received" amount={payment.paidAmount} emphasized />
            <ReceiptRow label="Remaining balance" amount={payment.balanceDue} emphasized />
          </div>
          <div className="grid gap-4 rounded-xl bg-secondary/30 p-4 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Method: </span>
              <span className="font-medium">{payment.paymentMethod || "Not recorded"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Reference: </span>
              <span className="font-medium">{payment.referenceNumber || "Not recorded"}</span>
            </p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            This receipt reflects the payment record maintained by Coach Johnson Realty. Keep it for your records. For questions about this balance, contact property management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptRow({
  label,
  amount,
  emphasized = false,
}: {
  label: string;
  amount: number;
  emphasized?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 border-t border-border px-4 py-3 text-sm">
      <span className={emphasized ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className="text-right font-semibold tabular-nums">${amount.toFixed(2)}</span>
    </div>
  );
}
