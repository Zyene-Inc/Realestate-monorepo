"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { type MoveInCharge, money } from "@/lib/move-in-charges";
import { toast } from "sonner";

type Action = "PAYMENT" | "UPDATE" | "WAIVE" | "VOID";

export function MoveInChargeActionDialog({
  action,
  charge,
  onSaved,
}: {
  action: Action;
  charge: MoveInCharge;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(() => String(charge.balanceDue));
  const [dueDate, setDueDate] = useState(() => charge.dueDate.slice(0, 10));
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("ach");
  const [reference, setReference] = useState("");

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) {
      setAmount(
        String(action === "UPDATE" ? charge.amount : charge.balanceDue),
      );
      setDueDate(charge.dueDate.slice(0, 10));
      setReason("");
      setReference("");
    }
    setOpen(nextOpen);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (action === "PAYMENT") {
        await api.post("/payments/move-in/record", {
          clientRequestId: crypto.randomUUID(),
          allocations: [{ chargeId: charge.id, amount: Number(amount) }],
          paymentMethod: method,
          referenceNumber: reference.trim() || undefined,
          notes: reason.trim() || undefined,
        });
      } else {
        await api.patch(`/payments/move-in/${charge.id}`, {
          clientRequestId: crypto.randomUUID(),
          action,
          reason,
          ...(action === "UPDATE"
            ? { amount: Number(amount), dueDate }
            : {}),
        });
      }
      toast.success(
        action === "PAYMENT" ? "Payment recorded" : "Charge updated",
      );
      setOpen(false);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update this charge"));
    } finally {
      setSaving(false);
    }
  }

  const title = {
    PAYMENT: "Record move-in payment",
    UPDATE: "Edit unpaid charge",
    WAIVE: "Waive remaining balance",
    VOID: "Void charge",
  }[action];
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={action === "PAYMENT" ? "default" : "outline"}
          />
        }
      >
        {action === "PAYMENT" ? "Record payment" : title.split(" ")[0]}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {charge.label} · {money.format(charge.balanceDue)} remaining
            </DialogDescription>
          </DialogHeader>
          {action === "PAYMENT" || action === "UPDATE" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${charge.id}-${action}-amount`}>Amount</Label>
                <Input
                  id={`${charge.id}-${action}-amount`}
                  type="number"
                  min="0.01"
                  max={action === "PAYMENT" ? charge.balanceDue : undefined}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              {action === "UPDATE" ? (
                <div className="space-y-2">
                  <Label htmlFor={`${charge.id}-due-date`}>Due date</Label>
                  <Input
                    id={`${charge.id}-due-date`}
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor={`${charge.id}-method`}>Method</Label>
                  <select
                    id={`${charge.id}-method`}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3"
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    <option value="ach">ACH</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="zelle">Zelle</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
            </div>
          ) : null}
          {action === "PAYMENT" ? (
            <div className="space-y-2">
              <Label htmlFor={`${charge.id}-reference`}>
                Reference number (optional)
              </Label>
              <Input
                id={`${charge.id}-reference`}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={100}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`${charge.id}-${action}-reason`}>
              {action === "PAYMENT" ? "Internal note (optional)" : "Reason"}
            </Label>
            <Textarea
              id={`${charge.id}-${action}-reason`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required={action !== "PAYMENT"}
              minLength={action === "PAYMENT" ? undefined : 3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Confirm {action.toLowerCase()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
