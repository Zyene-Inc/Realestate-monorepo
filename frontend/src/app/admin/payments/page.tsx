"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Play, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  PaymentManagementDialog,
  type AdminPayment,
} from "./_components/payment-management-dialog";
import { toast } from "sonner";
import { MoveInChargeLedger } from "./_components/move-in-charge-ledger";

type Payment = AdminPayment & {
  dueDate: string;
  billingPeriod?: string | null;
  managementCommissionAmount?: number | null;
  ownerProceedsAmount?: number | null;
  refundedAmount?: number;
};

type BillingRun = {
  billingPeriod: string;
  createdCharges: number;
  markedOverdue: number;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      const rows = await api.get("/payments");
      setPayments(rows as Payment[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load payments"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api
      .get("/payments")
      .then((rows: Payment[]) => {
        if (active) setPayments(rows);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(getErrorMessage(error, "Unable to load payments"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runBillingCycle() {
    setRunningBilling(true);
    try {
      const result = (await api.post(
        "/payments/billing/run",
        {},
      )) as BillingRun;
      await loadPayments();
      toast.success(
        `Billing checked for ${result.billingPeriod}: ${result.createdCharges} charge${result.createdCharges === 1 ? "" : "s"} created, ${result.markedOverdue} marked overdue.`,
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to run rental billing"));
    } finally {
      setRunningBilling(false);
    }
  }

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return payments;
    return payments.filter((payment) =>
      `${payment.tenant.firstName} ${payment.tenant.lastName} ${payment.status} ${payment.billingPeriod || ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [payments, query]);
  const collected = payments.reduce(
    (total, payment) => total + payment.paidAmount - (payment.refundedAmount || 0),
    0,
  );
  const outstanding = payments.reduce(
    (total, payment) => total + payment.balanceDue,
    0,
  );
  const commission = payments.reduce(
    (total, payment) => total + Number(payment.managementCommissionAmount || 0),
    0,
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Rental payments
          </h1>
          <p className="mt-2 max-w-3xl font-medium text-muted-foreground">
            Manage the monthly rent ledger, offline payment records, and late
            fees. Online rent payments stay tenant-initiated only.
          </p>
        </div>
        <Button
          onClick={() => void runBillingCycle()}
          disabled={runningBilling}
        >
          {runningBilling ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play aria-hidden="true" />
          )}
          Run billing check
        </Button>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Metric title="Collected" value={money.format(collected)} />
        <Metric title="Outstanding" value={money.format(outstanding)} />
        <Metric
          title="Management commission retained"
          value={money.format(commission)}
        />
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-11"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tenant, month, or status"
        />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant / billing period</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Paid / balance</TableHead>
                <TableHead>Johnson Realty commission</TableHead>
                <TableHead>Owner proceeds</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-muted-foreground"
                  >
                    No payment records found. Run the billing check to create
                    this month&apos;s rent charges.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-semibold">
                        {payment.tenant.firstName} {payment.tenant.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.billingPeriod
                          ? new Date(payment.billingPeriod).toLocaleDateString(
                              undefined,
                              {
                                month: "long",
                                year: "numeric",
                                timeZone: "UTC",
                              },
                            )
                          : `Due ${new Date(payment.dueDate).toLocaleDateString()}`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold tabular-nums">
                        {money.format(payment.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rent {money.format(payment.rentAmount)} · Fee{" "}
                        {money.format(payment.lateFee)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold tabular-nums">
                        {money.format(payment.paidAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance {money.format(payment.balanceDue)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {money.format(
                        Number(payment.managementCommissionAmount || 0),
                      )}
                    </TableCell>
                    <TableCell>
                      {money.format(Number(payment.ownerProceedsAmount || 0))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "PAID" ? "default" : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PaymentManagementDialog
                        payment={payment}
                        onSaved={loadPayments}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <MoveInChargeLedger />
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
