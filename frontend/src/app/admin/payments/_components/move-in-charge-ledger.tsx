"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  MOVE_IN_CATEGORY_LABELS,
  type MoveInCharge,
  type MoveInChargeCategory,
  type MoveInLease,
  money,
} from "@/lib/move-in-charges";
import { toast } from "sonner";
import { MoveInChargeActionDialog } from "./move-in-charge-action-dialog";

const categories = Object.keys(
  MOVE_IN_CATEGORY_LABELS,
) as MoveInChargeCategory[];

export function MoveInChargeLedger() {
  const [charges, setCharges] = useState<MoveInCharge[]>([]);
  const [leases, setLeases] = useState<MoveInLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaseId, setLeaseId] = useState("");
  const [category, setCategory] =
    useState<MoveInChargeCategory>("PET_FEE");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("");
  const [payoutTreatment, setPayoutTreatment] = useState(
    "OWNER_NET_OF_COMMISSION",
  );

  const load = useCallback(async () => {
    const [chargeRows, leaseRows] = await Promise.all([
      api.get("/payments/move-in"),
      api.get("/admin/leases"),
    ]);
    setCharges(chargeRows as MoveInCharge[]);
    setLeases(
      (leaseRows as MoveInLease[]).filter((lease) =>
        ["active", "expiring", "renewed"].includes(lease.status),
      ),
    );
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/payments/move-in"), api.get("/admin/leases")])
      .then(([chargeRows, leaseRows]) => {
        if (!active) return;
        setCharges(chargeRows as MoveInCharge[]);
        setLeases(
          (leaseRows as MoveInLease[]).filter((lease) =>
            ["active", "expiring", "renewed"].includes(lease.status),
          ),
        );
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(
            getErrorMessage(error, "Unable to load move-in charges"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedLease = useMemo(
    () => leases.find((lease) => lease.id === leaseId),
    [leaseId, leases],
  );
  const openTotal = charges
    .filter((charge) => ["OPEN", "PARTIAL"].includes(charge.status))
    .reduce((sum, charge) => sum + charge.balanceDue, 0);
  const receivedTotal = charges.reduce(
    (sum, charge) => sum + charge.paidAmount - charge.refundedAmount,
    0,
  );

  function updateCategory(next: MoveInChargeCategory) {
    setCategory(next);
    setLabel("");
    if (next === "FIRST_MONTH_RENT" && selectedLease) {
      setAmount(String(selectedLease.monthlyRent));
    }
    if (next === "SECURITY_DEPOSIT" && selectedLease) {
      setAmount(String(selectedLease.securityDeposit));
    }
    setPayoutTreatment(
      next === "SECURITY_DEPOSIT"
        ? "OWNER_FULL"
        : next === "FIRST_MONTH_RENT"
          ? "OWNER_NET_OF_COMMISSION"
          : payoutTreatment,
    );
  }

  async function postCharge(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/payments/move-in", {
        leaseId,
        charges: [
          {
            clientRequestId: crypto.randomUUID(),
            category,
            amount: Number(amount),
            dueDate: new Date(`${dueDate}T00:00:00.000Z`).toISOString(),
            payoutTreatment,
            label: label.trim() || undefined,
          },
        ],
      });
      toast.success("Move-in charge posted and resident notified");
      setAmount("");
      setLabel("");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to post move-in charge"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="move-in-ledger-title">
      <div>
        <h2 id="move-in-ledger-title" className="text-2xl font-semibold">
          Move-in charge ledger
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Post and collect first-month rent, deposits, pet fees, utilities, and
          other one-time charges separately from monthly rent.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Metric label="Open move-in balance" value={money.format(openTotal)} />
        <Metric label="Net move-in payments" value={money.format(receivedTotal)} />
        <Metric label="Ledger items" value={String(charges.length)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Post a categorized charge</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={postCharge} className="grid gap-5 lg:grid-cols-6">
            <Field label="Current lease" className="lg:col-span-2">
              <select
                className="h-11 w-full rounded-lg border border-input bg-background px-3"
                value={leaseId}
                onChange={(event) => setLeaseId(event.target.value)}
                required
              >
                <option value="">Choose resident and home…</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant.firstName} {lease.tenant.lastName} · {lease.unit.property.name} · Unit {lease.unit.unitNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                className="h-11 w-full rounded-lg border border-input bg-background px-3"
                value={category}
                onChange={(event) =>
                  updateCategory(event.target.value as MoveInChargeCategory)
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {MOVE_IN_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
              />
            </Field>
            <Field label="Who receives it">
              <select
                className="h-11 w-full rounded-lg border border-input bg-background px-3 disabled:opacity-60"
                value={payoutTreatment}
                disabled={
                  category === "FIRST_MONTH_RENT" ||
                  category === "SECURITY_DEPOSIT"
                }
                onChange={(event) => setPayoutTreatment(event.target.value)}
              >
                <option value="OWNER_NET_OF_COMMISSION">Owner, less commission</option>
                <option value="OWNER_FULL">Owner, full amount</option>
                <option value="JOHNSON_REALTY">Johnson Realty</option>
              </select>
            </Field>
            <Field label="Custom label (optional)" className="lg:col-span-2">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={MOVE_IN_CATEGORY_LABELS[category]}
                maxLength={120}
              />
            </Field>
            <div className="flex items-end lg:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Plus />}
                Post charge
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident / home</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Charge / balance</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-28 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
              ) : charges.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No move-in charges have been posted.</TableCell></TableRow>
              ) : charges.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell>
                    <p className="font-semibold">{charge.tenant.firstName} {charge.tenant.lastName}</p>
                    <p className="text-xs text-muted-foreground">{charge.unit.property.name} · Unit {charge.unit.unitNumber}</p>
                  </TableCell>
                  <TableCell><p className="font-medium">{charge.label}</p><p className="text-xs text-muted-foreground">{MOVE_IN_CATEGORY_LABELS[charge.category]}</p></TableCell>
                  <TableCell><p className="font-semibold tabular-nums">{money.format(charge.amount)}</p><p className="text-xs text-muted-foreground">Balance {money.format(charge.balanceDue)}</p></TableCell>
                  <TableCell>{new Date(charge.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={charge.status === "PAID" ? "default" : "secondary"}>{charge.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {["OPEN", "PARTIAL"].includes(charge.status) ? <MoveInChargeActionDialog action="PAYMENT" charge={charge} onSaved={load} /> : null}
                      {charge.status === "OPEN" && charge.paidAmount === 0 ? <MoveInChargeActionDialog action="UPDATE" charge={charge} onSaved={load} /> : null}
                      {["OPEN", "PARTIAL"].includes(charge.status) ? <MoveInChargeActionDialog action="WAIVE" charge={charge} onSaved={load} /> : null}
                      {charge.status === "OPEN" && charge.paidAmount === 0 ? <MoveInChargeActionDialog action="VOID" charge={charge} onSaved={load} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className ?? ""}`}><Label>{label}</Label>{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>;
}
