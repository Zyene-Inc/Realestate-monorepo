"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
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

export function StripeRentRefundDialog({
  paymentId,
  paidAmount,
  refundedAmount = 0,
  onRequested,
}: {
  paymentId: string;
  paidAmount: number;
  refundedAmount?: number;
  onRequested: () => Promise<void>;
}) {
  const refundable = Math.max(0, paidAmount - refundedAmount);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(() => refundable.toFixed(2));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAmount(refundable.toFixed(2));
    setReason("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > refundable) {
      toast.error("Enter an amount up to the refundable payment balance.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Add a short reason for the refund audit trail.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/payments/${paymentId}/stripe-refund`, {
        clientRequestId: crypto.randomUUID(),
        amount: parsedAmount,
        adjustmentReason: reason.trim(),
      });
      toast.success("Refund submitted to Stripe. The ledger will update after verification.");
      setOpen(false);
      await onRequested();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to request refund"));
    } finally {
      setSubmitting(false);
    }
  }

  if (refundable <= 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) reset();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <RotateCcw aria-hidden="true" /> Refund online payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Refund an online payment</DialogTitle>
            <DialogDescription>
              This sends the refund through Stripe, reverses the owner transfer,
              and returns the related management fee. The ledger updates only
              after Stripe verifies the refund by webhook.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-secondary/35 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Available to refund</span>
              <span className="font-semibold tabular-nums">${refundable.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`stripe-refund-amount-${paymentId}`}>Refund amount</Label>
            <Input
              id={`stripe-refund-amount-${paymentId}`}
              min="0.01"
              max={refundable.toFixed(2)}
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`stripe-refund-reason-${paymentId}`}>Refund reason</Label>
            <Textarea
              id={`stripe-refund-reason-${paymentId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example, duplicate payment or approved credit"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Request refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
