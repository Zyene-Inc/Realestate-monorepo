"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
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
  money,
  shortDate,
  statusLabel,
  type LeaseLifecycle,
} from "@/lib/lease-lifecycle";

export default function TenantLeaseLifecyclePage() {
  const [lease, setLease] = useState<LeaseLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotice, setShowNotice] = useState(false);
  const [noticeDate, setNoticeDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [moveOutDate, setMoveOutDate] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [tenantNotes, setTenantNotes] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLease(
        (await api.get("/tenant/lease-lifecycle")) as LeaseLifecycle | null,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load lease planning"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function run(
    task: () => Promise<unknown>,
    success: string,
    fallback: string,
  ) {
    setBusy(true);
    try {
      await task();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  }

  async function submitNotice(event: FormEvent) {
    event.preventDefault();
    await run(
      () =>
        api.post("/tenant/lease-lifecycle/vacate-notices", {
          noticeDate,
          plannedMoveOutDate: moveOutDate,
          forwardingAddress: address,
          reason: reason || undefined,
        }),
      "Move-out notice submitted",
      "Unable to submit notice",
    );
    setShowNotice(false);
  }

  if (loading)
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  if (!lease)
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <CalendarClock className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-5 text-2xl font-semibold">
          No lease lifecycle is available
        </h1>
        <p className="mt-2 text-muted-foreground">
          Contact management if you expect to see a current lease.
        </p>
      </div>
    );

  const renewal = lease.renewals[0] ?? null;
  const notice = lease.vacateNotices[0] ?? null;
  const inspection = notice?.inspection ?? null;
  const disposition = inspection?.disposition ?? null;
  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Lease planning
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Renewal and move-out
          </h1>
          <p className="mt-3 max-w-[70ch] text-muted-foreground">
            Review renewal documents, submit notice, follow the final
            walkthrough, and retain your deposit statement.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw /> Refresh
        </Button>
      </header>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
        <p className="font-semibold">
          {lease.unit.property.name} · Unit {lease.unit.unitNumber}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Current term {shortDate(lease.startDate)} – {shortDate(lease.endDate)}{" "}
          · {money(lease.monthlyRent)}/month
        </p>
      </section>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FileSignature className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Renewal offer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Renewals are only binding after the Verdocs package is signed.
            </p>
          </div>
        </div>
        {renewal ? (
          <div className="mt-5 rounded-xl bg-secondary/30 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {shortDate(renewal.proposedStartDate)} –{" "}
                  {shortDate(renewal.proposedEndDate)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {money(renewal.proposedMonthlyRent)}/month · respond by{" "}
                  {shortDate(renewal.offerExpiresAt)}
                </p>
              </div>
              <Badge className="capitalize">
                {statusLabel(renewal.status)}
              </Badge>
            </div>
            {renewal.status === "SIGNING" && renewal.envelope ? (
              <Button
                className="mt-4"
                nativeButton={false}
                render={<Link href="/tenant/documents" />}
              >
                <FileSignature /> Review and sign
              </Button>
            ) : null}
            {renewal.status === "SIGNED" ? (
              <p className="mt-4 text-sm">
                Signed. New terms activate automatically on{" "}
                {shortDate(renewal.proposedStartDate)}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Management has not issued a renewal offer.
          </p>
        )}
      </section>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <LogOut className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Notice to vacate</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit your planned date and forwarding address. Your home
                remains occupied until final handover is completed.
              </p>
            </div>
          </div>
          {!notice && lease.status !== "terminated" ? (
            <Button onClick={() => setShowNotice(true)}>
              <LogOut /> Submit notice
            </Button>
          ) : null}
        </div>
        {showNotice ? (
          <form
            className="mt-6 grid gap-4 border-t border-border pt-6 md:grid-cols-2"
            onSubmit={submitNotice}
          >
            <div>
              <Label>Notice date</Label>
              <Input
                className="mt-2"
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Planned move-out</Label>
              <Input
                className="mt-2"
                type="date"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Forwarding address</Label>
              <Input
                className="mt-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                minLength={10}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Reason or notes (optional)</Label>
              <Textarea
                className="mt-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button disabled={busy}>Submit notice</Button>
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
          <div className="mt-5 rounded-xl bg-secondary/30 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold">
                  Move-out planned for {shortDate(notice.plannedMoveOutDate)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {notice.forwardingAddress}
                </p>
              </div>
              <Badge className="capitalize">{statusLabel(notice.status)}</Badge>
            </div>
            {notice.status === "SUBMITTED" ? (
              <Button
                className="mt-4"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api.delete(
                        `/tenant/lease-lifecycle/vacate-notices/${notice.id}`,
                      ),
                    "Notice canceled",
                    "Unable to cancel notice",
                  )
                }
              >
                Cancel notice
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {inspection ? (
        <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Final inspection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {inspection.scheduledAt
                  ? `Scheduled ${new Date(inspection.scheduledAt).toLocaleString()}`
                  : "Awaiting schedule"}
              </p>
            </div>
            <Badge className="capitalize">
              {statusLabel(inspection.status)}
            </Badge>
          </div>
          {["COMPLETED", "TENANT_ACKNOWLEDGED"].includes(inspection.status) ? (
            <div className="mt-5 divide-y divide-border rounded-xl border border-border">
              {inspection.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {item.area} · {item.name}
                    </p>
                    <p className="text-muted-foreground">
                      {item.notes || "No notes"}
                    </p>
                  </div>
                  <span className="capitalize">
                    {statusLabel(item.condition)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {inspection.status === "COMPLETED" ? (
            <div className="mt-5">
              <Label>Your acknowledgement notes (optional)</Label>
              <Textarea
                className="mt-2"
                value={tenantNotes}
                onChange={(e) => setTenantNotes(e.target.value)}
              />
              <Button
                className="mt-3"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api.post(
                        `/tenant/lease-lifecycle/inspections/${inspection.id}/acknowledge`,
                        { tenantNotes: tenantNotes || undefined },
                      ),
                    "Final inspection acknowledged",
                    "Unable to acknowledge inspection",
                  )
                }
              >
                <CheckCircle2 /> Acknowledge record
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {disposition ? (
        <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Security deposit statement
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Return deadline {shortDate(disposition.dueDate)}
              </p>
            </div>
            <Badge className="capitalize">
              {statusLabel(disposition.status)}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Held" value={money(disposition.amountHeld)} />
            <Metric
              label="Deductions"
              value={money(disposition.deductionsTotal)}
            />
            <Metric label="Return" value={money(disposition.refundAmount)} />
          </div>
          {disposition.deductions.length ? (
            <div className="mt-5 divide-y divide-border">
              {disposition.deductions.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {statusLabel(item.category)}
                    </p>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                  <span>{money(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {disposition.proofStoragePath ? (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    async () => {
                      const result = (await api.get(
                        `/tenant/lease-lifecycle/deposits/${disposition.id}/proof`,
                      )) as { url: string };
                      window.location.assign(result.url);
                    },
                    "Proof opened",
                    "Unable to open proof",
                  )
                }
              >
                <FileText /> View return proof
              </Button>
            ) : null}
            {["ITEMIZED", "ISSUED"].includes(disposition.status) ? (
              <div className="w-full rounded-xl border border-border p-4">
                <div className="flex gap-3">
                  <ShieldAlert className="size-5 text-primary" />
                  <p className="font-semibold">Question this statement</p>
                </div>
                <Textarea
                  className="mt-3"
                  placeholder="Explain the item you dispute"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={busy || disputeReason.trim().length < 3}
                  onClick={() =>
                    run(
                      () =>
                        api.post(
                          `/tenant/lease-lifecycle/deposits/${disposition.id}/dispute`,
                          { reason: disputeReason },
                        ),
                      "Dispute submitted",
                      "Unable to submit dispute",
                    )
                  }
                >
                  Submit dispute
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
