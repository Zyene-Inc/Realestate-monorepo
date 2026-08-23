"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const staffStatuses = ["PENDING", "OVERDUE", "PARTIAL", "PAID", "WAIVED"] as const;

export type AdminPayment = {
  id: string;
  status: string;
  rentAmount: number;
  lateFee: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentMethod: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  stripeCheckoutStatus?: string;
  tenant: { firstName: string; lastName: string };
};

type FormState = {
  status: string;
  paidAmount: string;
  lateFee: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  adjustmentReason: string;
};

function initialForm(payment: AdminPayment): FormState {
  return {
    status: payment.status,
    paidAmount: payment.paidAmount.toFixed(2),
    lateFee: payment.lateFee.toFixed(2),
    paymentMethod: payment.paymentMethod || "",
    referenceNumber: payment.referenceNumber || "",
    notes: payment.notes || "",
    adjustmentReason: "",
  };
}

export function PaymentManagementDialog({
  payment,
  onSaved,
}: {
  payment: AdminPayment;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(payment));

  const chargedAmount = payment.rentAmount + Number(form.lateFee || 0);
  const paidAmount = Number(form.paidAmount || 0);
  const feeChanged = Number(form.lateFee || 0) !== payment.lateFee;
  const canWaive = payment.paidAmount === 0;
  const stripeConfirmed = payment.stripeCheckoutStatus === "COMPLETE";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      toast.error("Enter a valid amount received.");
      return;
    }
    if (!Number.isFinite(Number(form.lateFee)) || Number(form.lateFee) < 0) {
      toast.error("Enter a valid late fee.");
      return;
    }
    if (feeChanged && !form.adjustmentReason.trim()) {
      toast.error("Explain the late-fee adjustment for the audit trail.");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/payments/${payment.id}/status`, {
        clientRequestId: crypto.randomUUID(),
        status: form.status,
        paidAmount,
        lateFee: Number(form.lateFee),
        paymentMethod: form.paymentMethod || undefined,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        adjustmentReason: form.adjustmentReason || undefined,
      });
      await onSaved();
      toast.success("Payment record updated.");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update payment"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setForm(initialForm(payment));
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil aria-hidden="true" /> Manage
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Manage rent payment</DialogTitle>
            <DialogDescription>
              Record a check, cash, ACH, or other offline payment. This does not
              charge the resident or alter an open Stripe checkout.
            </DialogDescription>
          </DialogHeader>
          {stripeConfirmed ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              This payment was confirmed by Stripe. Financial changes are locked
              here; use Stripe&apos;s refund workflow if a correction is required.
            </p>
          ) : null}

          <div className="grid gap-4 rounded-xl border border-border bg-secondary/30 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Base rent</p>
              <p className="mt-1 font-semibold tabular-nums">
                ${payment.rentAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Current balance</p>
              <p className="mt-1 font-semibold tabular-nums">
                ${payment.balanceDue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">New charge total</p>
              <p className="mt-1 font-semibold tabular-nums">
                ${chargedAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`payment-status-${payment.id}`}>Status</Label>
              <select
                id={`payment-status-${payment.id}`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                disabled={stripeConfirmed}
                onChange={(event) => {
                  const status = event.target.value;
                  setForm((current) => ({
                    ...current,
                    status,
                    paidAmount:
                      status === "PAID"
                        ? (payment.rentAmount + Number(current.lateFee)).toFixed(2)
                        : current.paidAmount,
                  }));
                }}
              >
                {staffStatuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={status === "WAIVED" && !canWaive}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              {!canWaive ? (
                <p className="text-xs text-muted-foreground">
                  Received money cannot be waived.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-paid-${payment.id}`}>Amount received</Label>
              <Input
                id={`payment-paid-${payment.id}`}
                min="0"
                step="0.01"
                type="number"
                value={form.paidAmount}
                disabled={stripeConfirmed}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paidAmount: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-method-${payment.id}`}>Payment method</Label>
              <select
                id={`payment-method-${payment.id}`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentMethod: event.target.value }))
                }
              >
                <option value="">Choose if received offline</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="ach">ACH / bank transfer</option>
                <option value="wire">Wire transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-reference-${payment.id}`}>Reference number</Label>
              <Input
                id={`payment-reference-${payment.id}`}
                value={form.referenceNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, referenceNumber: event.target.value }))
                }
                placeholder="Check, ACH, or receipt number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-late-fee-${payment.id}`}>Late fee</Label>
              <Input
                id={`payment-late-fee-${payment.id}`}
                min="0"
                step="0.01"
                type="number"
                value={form.lateFee}
                disabled={stripeConfirmed}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lateFee: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-fee-reason-${payment.id}`}>
                Late-fee adjustment reason
              </Label>
              <Input
                id={`payment-fee-reason-${payment.id}`}
                value={form.adjustmentReason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adjustmentReason: event.target.value,
                  }))
                }
                placeholder={feeChanged ? "Required" : "Only if the fee changes"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`payment-notes-${payment.id}`}>Internal staff note</Label>
            <Textarea
              id={`payment-notes-${payment.id}`}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Optional note visible to authorized staff only"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Save payment record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
