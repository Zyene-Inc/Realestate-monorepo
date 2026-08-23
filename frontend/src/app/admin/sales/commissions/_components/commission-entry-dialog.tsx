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

export function CommissionEntryDialog({
  model,
  saving,
}: {
  model: CommissionDialogsProps["create"];
  saving: boolean;
}) {
  const {
    open,
    setOpen,
    entry,
    setEntry,
    eligible,
    eligibleCursor,
    selectedListing,
    loadMoreListings,
    submit,
  } = model;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record received commission</DialogTitle>
          <DialogDescription>
            Use only the amount Johnson Realty received. Do not enter buyer
            banking, loan, escrow, or purchase-payment data.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="commission-property">Closed sale listing</Label>
            <select
              id="commission-property"
              required
              className={inputClass}
              value={entry.propertyId}
              onChange={(event) => {
                const propertyId = event.target.value;
                const listing = eligible.find((item) => item.id === propertyId);
                setEntry((current) => ({
                  ...current,
                  propertyId,
                  salePrice: current.salePrice || listing?.price || "",
                }));
              }}
            >
              <option value="">Choose a sold property</option>
              {eligible.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.city}, {item.state} —{" "}
                  {item.agent.companyName}
                </option>
              ))}
            </select>
            {eligibleCursor && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void loadMoreListings()}
              >
                Load more sold listings
              </Button>
            )}
          </div>
          {selectedListing && (
            <div className="rounded-xl bg-secondary p-4 text-sm">
              <strong>{selectedListing.agent.companyName}</strong>
              <p className="mt-1 text-muted-foreground">
                Responsible agent: {selectedListing.agent.contactName}.
                Attribution is taken from the approved listing.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sale-price">Final sale price (optional)</Label>
              <Input
                id="sale-price"
                inputMode="decimal"
                placeholder="425000.00"
                value={entry.salePrice}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    salePrice: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission-amount">Commission received</Label>
              <Input
                id="commission-amount"
                required
                inputMode="decimal"
                placeholder="12750.00"
                value={entry.commissionAmount}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    commissionAmount: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="received-date">Date received</Label>
              <Input
                id="received-date"
                required
                type="date"
                value={entry.receivedAt}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    receivedAt: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Receipt method</Label>
              <select
                id="payment-method"
                className={inputClass}
                value={entry.paymentMethod}
                onChange={(event) =>
                  setEntry((current) => ({
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
            <Label htmlFor="reference-number">
              Reference number (optional)
            </Label>
            <Input
              id="reference-number"
              maxLength={100}
              value={entry.referenceNumber}
              onChange={(event) =>
                setEntry((current) => ({
                  ...current,
                  referenceNumber: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission-notes">Notes (optional)</Label>
            <Textarea
              id="commission-notes"
              maxLength={2000}
              value={entry.notes}
              onChange={(event) =>
                setEntry((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
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
              Record receipt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
