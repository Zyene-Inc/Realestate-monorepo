import { AlertTriangle, History, Loader2, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  commissionDate,
  commissionMoney,
  type SaleCommission,
} from "@/lib/sale-commissions";
import type { CommissionDialogsProps } from "./commission-dialog-types";

function EventTimeline({ commission }: { commission: SaleCommission }) {
  if (!commission.events?.length) return null;
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <History className="h-4 w-4" /> Audit timeline
      </h3>
      <ol className="space-y-4 border-l pl-5">
        {commission.events.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{event.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {commissionDate(event.createdAt)} · {event.actor.email}
              </span>
            </div>
            {event.reason && (
              <p className="mt-2 text-sm">Reason: {event.reason}</p>
            )}
            {event.type === "CORRECTED" && event.newValue && (
              <p className="mt-1 text-xs text-muted-foreground">
                Updated commission:{" "}
                {commissionMoney(String(event.newValue.commissionAmount ?? 0))}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CommissionDetailsDialog({
  model,
}: {
  model: CommissionDialogsProps["details"];
}) {
  const { open, setOpen, selected, beginCorrection, beginVoid } = model;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        {!selected ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{selected.property.name}</DialogTitle>
                <Badge
                  variant={selected.status === "ACTIVE" ? "default" : "outline"}
                >
                  {selected.status}
                </Badge>
              </div>
              <DialogDescription>
                {selected.property.address}, {selected.property.city},{" "}
                {selected.property.state} {selected.property.zip}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 rounded-xl bg-secondary/50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Commission received
                </p>
                <p className="text-xl font-semibold">
                  {commissionMoney(selected.commissionAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sale price</p>
                <p className="text-xl font-semibold">
                  {selected.salePrice
                    ? commissionMoney(selected.salePrice)
                    : "Not recorded"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receipt</p>
                <p>
                  {commissionDate(selected.receivedAt)} ·{" "}
                  {selected.paymentMethod}
                </p>
                {selected.referenceNumber && (
                  <p className="text-xs text-muted-foreground">
                    Ref: {selected.referenceNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p>{selected.agent.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.agent.contactName}
                </p>
              </div>
            </div>
            {selected.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 text-sm">{selected.notes}</p>
              </div>
            )}
            {selected.status === "VOIDED" && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="flex items-center gap-2 font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Voided
                </p>
                <p className="mt-1 text-sm">{selected.voidReason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.voidedAt && commissionDate(selected.voidedAt)} ·{" "}
                  {selected.voidedBy?.email}
                </p>
              </div>
            )}
            <EventTimeline commission={selected} />
            {selected.status === "ACTIVE" && (
              <DialogFooter>
                <Button variant="destructive" onClick={beginVoid}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Void
                </Button>
                <Button onClick={beginCorrection}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Correct
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
