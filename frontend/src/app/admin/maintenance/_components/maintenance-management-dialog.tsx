"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { CalendarClock, Loader2, ReceiptText, Wrench } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  MAINTENANCE_STATUSES,
  MaintenanceRequest,
  Vendor,
  maintenanceStatusLabel,
} from "./maintenance-types";

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const selectableMaintenanceStatuses = MAINTENANCE_STATUSES.filter(
  (option) => option.value !== "tenant_confirmed",
);

export function MaintenanceManagementDialog({
  request,
  vendors,
  onOpenChange,
  onSaved,
}: {
  request: MaintenanceRequest;
  vendors: Vendor[];
  onOpenChange: (open: boolean) => void;
  onSaved: (request: MaintenanceRequest) => Promise<void>;
}) {
  const [status, setStatus] = useState(request.status);
  const [vendorId, setVendorId] = useState(request.vendor?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState(() =>
    localDateTime(request.scheduledDate),
  );
  const [cost, setCost] = useState(request.cost ?? "");
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const tenantConfirmed = request.status === "tenant_confirmed";
  const ledgerTotal = Number(request.ownerExpenseTotal);
  const proposedCost = cost === "" ? null : Number(cost);
  const remainsCompleted = ["completed", "tenant_confirmed"].includes(status);
  const targetLedgerTotal = remainsCompleted ? (proposedCost ?? 0) : 0;
  const adjustment = targetLedgerTotal - ledgerTotal;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = (await api.patch(`/admin/maintenance/${request.id}`, {
        status: tenantConfirmed ? undefined : status,
        assignedVendorId: vendorId || null,
        scheduledDate: scheduledDate
          ? new Date(scheduledDate).toISOString()
          : null,
        cost: cost === "" ? null : Number(cost),
        adminNotes: adminNotes.trim() || null,
      })) as MaintenanceRequest;
      await onSaved(updated);
      toast.success("Maintenance request saved");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save maintenance request"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={save} className="space-y-6">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{request.priority}</Badge>
              <Badge variant="secondary">
                {maintenanceStatusLabel(request.status)}
              </Badge>
            </div>
            <DialogTitle className="pt-2 capitalize">
              {request.category} service request
            </DialogTitle>
            <DialogDescription>
              {request.property.name}, unit {request.unit.unitNumber}. Submitted
              by {request.tenant.firstName} {request.tenant.lastName}.
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
            <p className="text-sm leading-6 text-foreground">
              {request.description}
            </p>
            {request.preferredAccessTimes ? (
              <p className="text-sm text-muted-foreground">
                Preferred access: {request.preferredAccessTimes}
              </p>
            ) : null}
            {request.photoUrls.length ? (
              <div className="flex flex-wrap gap-3">
                {request.photoUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Image
                      src={url}
                      alt={`${request.category} evidence ${index + 1}`}
                      width={120}
                      height={90}
                      className="h-[90px] w-[120px] rounded-lg object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-status">Workflow status</Label>
              <select
                id="maintenance-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={tenantConfirmed}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectableMaintenanceStatuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {tenantConfirmed ? (
                <p className="text-xs text-muted-foreground">
                  The tenant confirmed completion. Financial corrections remain
                  available below.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-vendor">Assigned vendor</Label>
              <select
                id="maintenance-vendor"
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No vendor assigned</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                    {vendor.companyName ? `, ${vendor.companyName}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Assignment or schedule changes notify vendors that have an
                email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-schedule">
                Service date and time
              </Label>
              <div className="relative">
                <CalendarClock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="maintenance-schedule"
                  type="datetime-local"
                  className="pl-10"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-cost">Final cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="maintenance-cost"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  inputMode="decimal"
                  className="pl-7"
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  placeholder="Required before completion"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter 0 for no-charge work. A completed positive amount posts to
                the property owner ledger.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-notes">Internal work notes</Label>
            <Textarea
              id="maintenance-notes"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder="Scope, access details, vendor follow-up, invoice reference, or completion notes"
              className="min-h-28"
            />
            <p className="text-xs text-muted-foreground">
              Internal notes are not included in tenant or vendor email updates.
            </p>
          </div>

          <section className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <ReceiptText className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">Owner expense ledger</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.ownerExpenseEntryCount} entr
                  {request.ownerExpenseEntryCount === 1 ? "y" : "ies"}, current
                  total ${ledgerTotal.toFixed(2)}
                </p>
              </div>
            </div>
            {Math.abs(adjustment) >= 0.005 ? (
              <p className="text-sm font-medium tabular-nums">
                Next adjustment: {adjustment < 0 ? "−" : "+"}$
                {Math.abs(adjustment).toFixed(2)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No ledger change</p>
            )}
          </section>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Wrench aria-hidden="true" />
              )}
              Save request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
