"use client";

import { useEffect, useState } from "react";
import { Calendar, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { MoveInPaymentPanel } from "./_components/move-in-payment-panel";

type Payment = {
  id: string;
  status: "PENDING" | "OVERDUE" | "PARTIAL" | "PAID" | "WAIVED" | "REFUNDED";
  rentAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: string;
};

type CheckoutResponse = { url: string };

const payableStatuses = new Set<Payment["status"]>([
  "PENDING",
  "OVERDUE",
  "PARTIAL",
]);

export default function TenantPayRent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingPaymentId, setStartingPaymentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    api
      .get("/payments/my")
      .then((rows: Payment[]) =>
        setPayments(
          rows.filter(
            (payment) =>
              payableStatuses.has(payment.status) && payment.balanceDue > 0,
          ),
        ),
      )
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load rent payments")),
      )
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout(paymentId: string) {
    setStartingPaymentId(paymentId);
    try {
      const checkout = (await api.post(
        `/payments/${paymentId}/checkout`,
        {},
      )) as CheckoutResponse;
      window.location.assign(checkout.url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start secure checkout"));
      setStartingPaymentId(null);
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Pay rent
        </h1>
        <p className="mt-2 font-medium text-muted-foreground">
          Choose a payment below, then complete the secure one-time checkout.
        </p>
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-4 p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">You stay in control</p>
            <p className="text-muted-foreground">
              Coach Johnson Realty never automatically debits your bank account
              or card. Every rent payment requires you to return here and
              actively start checkout.
            </p>
          </div>
        </CardContent>
      </Card>
      <MoveInPaymentPanel />
      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            There are no rent payments ready for online checkout.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {payments.map((payment) => (
            <Card
              key={payment.id}
              className="overflow-hidden rounded-[1.25rem] border-border bg-card"
            >
              <CardHeader className="border-b border-border bg-secondary/35">
                <CardTitle className="flex items-center justify-between gap-4 text-base">
                  <span>Rent payment</span>
                  <span className="font-heading text-xl tabular-nums">
                    ${payment.balanceDue.toFixed(2)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  Due {new Date(payment.dueDate).toLocaleDateString()}
                </p>
                <div className="space-y-1 rounded-lg bg-secondary/45 p-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Base rent</span>
                    <span className="tabular-nums">${payment.rentAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Late fee</span>
                    <span className="tabular-nums">${payment.lateFee.toFixed(2)}</span>
                  </div>
                </div>
                {payment.paidAmount > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ${payment.paidAmount.toFixed(2)} already recorded; the
                    balance shown is due now.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={startingPaymentId !== null}
                  onClick={() => startCheckout(payment.id)}
                >
                  {startingPaymentId === payment.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  Pay ${payment.balanceDue.toFixed(2)} securely
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
