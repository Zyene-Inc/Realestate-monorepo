import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommissionPaymentMethod } from "@/lib/sale-commissions";
import {
  commissionInputClass as inputClass,
  commissionPaymentMethods as paymentMethods,
  type CommissionDialogsProps,
} from "./commission-dialog-types";

export function CommissionCorrectionDialog({
  model,
  saving,
}: {
  model: CommissionDialogsProps["correction"];
  saving: boolean;
}) {
  const { open, setOpen, form, setForm, reason, setReason, submit } = model;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Correct commission record</DialogTitle>
          <DialogDescription>
            The previous values remain in the audit timeline. Listing and agent
            attribution cannot be changed; void and recreate if those are wrong.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="correct-sale-price">Sale price</Label>
              <Input
                id="correct-sale-price"
                inputMode="decimal"
                value={form.salePrice}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    salePrice: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct-commission">Commission received</Label>
              <Input
                id="correct-commission"
                required
                inputMode="decimal"
                value={form.commissionAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    commissionAmount: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="correct-date">Date received</Label>
              <Input
                id="correct-date"
                required
                type="date"
                value={form.receivedAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    receivedAt: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct-method">Method</Label>
              <select
                id="correct-method"
                className={inputClass}
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paymentMethod: event.target
                      .value as CommissionPaymentMethod,
                  }))
                }
              >
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct-reference">Reference number</Label>
            <Input
              id="correct-reference"
              maxLength={100}
              value={form.referenceNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  referenceNumber: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct-notes">Notes</Label>
            <Textarea
              id="correct-notes"
              maxLength={2000}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correction-reason">Reason for correction</Label>
            <Textarea
              id="correction-reason"
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
