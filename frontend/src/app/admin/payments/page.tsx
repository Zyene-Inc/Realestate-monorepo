"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

type Payment = {
  id: string;
  status: string;
  rentAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentMethod: string | null;
  dueDate: string;
  tenant: { firstName: string; lastName: string };
  unit: { unitNumber: string };
  propertyOwner?: {
    ownerName?: string | null;
    companyName?: string | null;
  } | null;
  managementCommissionAmount?: number | null;
  ownerProceedsAmount?: number | null;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/payments")
      .then((rows: Payment[]) => setPayments(rows))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load payments")),
      )
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return payments;
    return payments.filter((payment) =>
      `${payment.tenant.firstName} ${payment.tenant.lastName} ${payment.unit.unitNumber} ${payment.status}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [payments, query]);
  const collected = payments.reduce(
    (total, payment) => total + payment.paidAmount,
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
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Rental payments
        </h1>
        <p className="mt-2 font-medium text-muted-foreground">
          Live payment ledger. Online rent payments are tenant-initiated only;
          owner proceeds move automatically through Stripe after payment
          confirmation.
        </p>
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
          placeholder="Search tenant, unit, or status"
        />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant / unit</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Johnson Realty commission</TableHead>
                <TableHead>Owner proceeds</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
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
                    No payments found.
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
                        Unit {payment.unit.unitNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      {money.format(payment.totalAmount)}
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>{money.format(payment.paidAmount)}</TableCell>
                    <TableCell>
                      {money.format(
                        Number(payment.managementCommissionAmount || 0),
                      )}
                    </TableCell>
                    <TableCell>
                      {money.format(Number(payment.ownerProceedsAmount || 0))}
                    </TableCell>
                    <TableCell className="text-xs uppercase">
                      {payment.paymentMethod || "—"}
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
