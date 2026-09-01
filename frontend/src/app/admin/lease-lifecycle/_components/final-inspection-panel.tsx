"use client";

import { useReducer, useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  statusLabel,
  type InspectionCondition,
  type MoveOutInspection,
} from "@/lib/lease-lifecycle";

const conditions: InspectionCondition[] = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
  "NOT_APPLICABLE",
];

export function FinalInspectionPanel({
  inspection,
  forwardingAddress,
  onUpdated,
}: {
  inspection: MoveOutInspection;
  forwardingAddress: string;
  onUpdated: () => Promise<void>;
}) {
  const [items, setItems] = useReducer(
    (
      _current: Array<
        MoveOutInspection["items"][number] & { estimatedCost: string }
      >,
      next: Array<
        MoveOutInspection["items"][number] & { estimatedCost: string }
      >,
    ) => next,
    inspection.items,
    (initial) =>
      initial.map((item) => ({
        ...item,
        estimatedCost: String(item.estimatedCost),
      })),
  );
  const [actualMoveOutAt, setActualMoveOutAt] = useState("");
  const [turnoverStatus, setTurnoverStatus] = useState("READY_TO_RENT");
  const [keysReturned, setKeysReturned] = useState(false);
  const [address, setAddress] = useReducer(
    (_current: string, next: string) => next,
    forwardingAddress,
  );
  const [staffNotes, setStaffNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [latestMoveOutValue] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const editable = ["DRAFT", "SCHEDULED"].includes(inspection.status);

  async function complete(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(
        `/admin/lease-lifecycle/inspections/${inspection.id}/complete`,
        {
          expectedRevision: inspection.revision,
          actualMoveOutAt: new Date(actualMoveOutAt).toISOString(),
          turnoverStatus,
          keysReturned,
          forwardingAddress: address,
          staffNotes: staffNotes || undefined,
          items: items.map((item) => ({
            id: item.id,
            condition: item.condition,
            notes: item.notes || undefined,
            estimatedCost: Number(item.estimatedCost),
          })),
        },
      );
      toast.success("Move-out completed and occupancy released");
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to complete move-out"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <ClipboardCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <h3 className="font-semibold">Final condition and key handover</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete every item before the lease is terminated and the unit is
              released.
            </p>
          </div>
        </div>
        <Badge className="capitalize">{statusLabel(inspection.status)}</Badge>
      </div>
      {editable ? (
        <form className="mt-5 space-y-5" onSubmit={complete}>
          <div className="divide-y divide-border rounded-xl border border-border">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-3 p-4 lg:grid-cols-[1fr_12rem_9rem]"
              >
                <div>
                  <p className="font-medium">
                    {item.area} · {item.name}
                  </p>
                  <Input
                    className="mt-2"
                    placeholder="Condition notes"
                    value={item.notes || ""}
                    onChange={(e) =>
                      setItems(
                        items.map((row, i) =>
                          i === index ? { ...row, notes: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`condition-${item.id}`}>Condition</Label>
                  <select
                    id={`condition-${item.id}`}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                    value={item.condition}
                    onChange={(e) =>
                      setItems(
                        items.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                condition: e.target
                                  .value as InspectionCondition,
                              }
                            : row,
                        ),
                      )
                    }
                  >
                    <option value="NOT_INSPECTED">Choose…</option>
                    {conditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {statusLabel(condition)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Estimated cost</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.estimatedCost}
                    onChange={(e) =>
                      setItems(
                        items.map((row, i) =>
                          i === index
                            ? { ...row, estimatedCost: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Actual move-out</Label>
              <Input
                className="mt-2"
                type="datetime-local"
                max={latestMoveOutValue}
                value={actualMoveOutAt}
                onChange={(e) => setActualMoveOutAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="move-out-turnover-status">Turnover status</Label>
              <select
                id="move-out-turnover-status"
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                value={turnoverStatus}
                onChange={(e) => setTurnoverStatus(e.target.value)}
              >
                <option value="READY_TO_RENT">Ready to rent</option>
                <option value="MAINTENANCE_REQUIRED">
                  Maintenance required
                </option>
              </select>
            </div>
            <div>
              <Label>Verified forwarding address</Label>
              <Input
                className="mt-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                minLength={10}
                required
              />
            </div>
            <label className="flex items-end gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={keysReturned}
                onChange={(e) => setKeysReturned(e.target.checked)}
              />
              <span className="text-sm font-medium">
                All keys and access devices returned
              </span>
            </label>
          </div>
          <div>
            <Label>Staff notes</Label>
            <Textarea
              className="mt-2"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
            />
          </div>
          <Button disabled={busy || !keysReturned || !actualMoveOutAt}>
            {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{" "}
            Complete move-out
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          The final inspection is complete. Deposit itemization is now available
          below.
        </p>
      )}
    </div>
  );
}
