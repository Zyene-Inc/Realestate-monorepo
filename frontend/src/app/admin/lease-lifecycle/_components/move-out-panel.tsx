"use client";

import { useState, type FormEvent } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  Loader2,
  LogOut,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  shortDate,
  statusLabel,
  type LeaseLifecycle,
} from "@/lib/lease-lifecycle";
import { DepositDispositionPanel } from "./deposit-disposition-panel";
import { FinalInspectionPanel } from "./final-inspection-panel";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function MoveOutPanel({
  lease,
  onUpdated,
}: {
  lease: LeaseLifecycle;
  onUpdated: () => Promise<void>;
}) {
  const [showNotice, setShowNotice] = useState(false);
  const [noticeDate, setNoticeDate] = useState(today);
  const [moveOutDate, setMoveOutDate] = useState(() =>
    lease.endDate.slice(0, 10),
  );
  const [source, setSource] = useState("MANAGEMENT");
  const [reason, setReason] = useState("");
  const [address, setAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = lease.vacateNotices[0] ?? null;

  async function createNotice(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(
        `/admin/lease-lifecycle/leases/${lease.id}/vacate-notices`,
        {
          source,
          noticeDate,
          plannedMoveOutDate: moveOutDate,
          reason: reason || undefined,
          forwardingAddress: address,
        },
      );
      toast.success("Notice to vacate recorded");
      setShowNotice(false);
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to record notice"));
    } finally {
      setBusy(false);
    }
  }

  async function schedule(event: FormEvent) {
    event.preventDefault();
    if (!notice) return;
    setBusy(true);
    try {
      await api.post(
        `/admin/lease-lifecycle/notices/${notice.id}/acknowledge`,
        {
          scheduledAt: new Date(scheduledAt).toISOString(),
        },
      );
      toast.success("Final inspection scheduled");
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to schedule inspection"));
    } finally {
      setBusy(false);
    }
  }

  async function cancelNotice() {
    if (!notice) return;
    setBusy(true);
    try {
      await api.delete(`/admin/lease-lifecycle/notices/${notice.id}`);
      toast.success("Notice canceled; occupancy remains active");
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel notice"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <LogOut className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">
              Move-out and deposit return
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Occupancy remains active until the final inspection, key return,
              and actual move-out are completed.
            </p>
          </div>
        </div>
        {!notice && lease.status !== "terminated" ? (
          <Button onClick={() => setShowNotice(true)}>
            <LogOut /> Record notice
          </Button>
        ) : null}
      </div>

      {showNotice ? (
        <form
          onSubmit={createNotice}
          className="mt-6 grid gap-5 border-t border-border pt-6 md:grid-cols-2"
        >
          <Field label="Notice source">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="MANAGEMENT">Management</option>
              <option value="MUTUAL">Mutual agreement</option>
            </select>
          </Field>
          <Field label="Notice date">
            <Input
              type="date"
              value={noticeDate}
              onChange={(e) => setNoticeDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Planned move-out">
            <Input
              type="date"
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Forwarding address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              minLength={10}
              required
            />
          </Field>
          <div className="md:col-span-2">
            <Label htmlFor="notice-reason">Reason or agreement notes</Label>
            <Textarea
              id="notice-reason"
              className="mt-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 md:col-span-2">
            <Button disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LogOut />} Save
              notice
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNotice(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {notice ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-secondary/25 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {statusLabel(notice.source)} notice · move-out{" "}
                  {shortDate(notice.plannedMoveOutDate)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forwarding address: {notice.forwardingAddress}
                </p>
              </div>
              <Badge className="capitalize">{statusLabel(notice.status)}</Badge>
            </div>
            {["SUBMITTED", "ACKNOWLEDGED", "MOVE_OUT_IN_PROGRESS"].includes(
              notice.status,
            ) ? (
              <Button
                className="mt-4"
                variant="outline"
                disabled={busy}
                onClick={() => void cancelNotice()}
              >
                <X /> Cancel notice
              </Button>
            ) : null}
          </div>

          {notice.status === "SUBMITTED" ? (
            <form
              onSubmit={schedule}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex gap-3">
                <CalendarCheck className="mt-0.5 size-5 text-primary" />
                <div>
                  <h3 className="font-semibold">
                    Acknowledge and schedule walkthrough
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The resident receives the appointment by email and in the
                    portal.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Final inspection">
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                  />
                </Field>
                <Button disabled={busy || !scheduledAt}>
                  <ClipboardCheck /> Confirm schedule
                </Button>
              </div>
            </form>
          ) : null}

          {notice.inspection ? (
            <FinalInspectionPanel
              inspection={notice.inspection}
              forwardingAddress={notice.forwardingAddress || ""}
              onUpdated={onUpdated}
            />
          ) : null}
          {notice.inspection?.disposition ? (
            <DepositDispositionPanel
              disposition={notice.inspection.disposition}
              onUpdated={onUpdated}
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No move-out notice is active. The unit remains occupied.
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-52 flex-1 space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
