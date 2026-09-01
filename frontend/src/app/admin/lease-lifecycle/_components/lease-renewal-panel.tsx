"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, FileSignature, Loader2, Send, X } from "lucide-react";
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

type RenewalForm = {
  proposedStartDate: string;
  proposedEndDate: string;
  proposedMonthlyRent: string;
  proposedSecurityDeposit: string;
  proposedRentDueDay: string;
  proposedGracePeriodDays: string;
  proposedLateFeeAmount: string;
  offerExpiresAt: string;
  internalNotes: string;
};

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaults(lease: LeaseLifecycle): RenewalForm {
  const start = new Date(lease.endDate);
  start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 14);
  return {
    proposedStartDate: isoDate(start),
    proposedEndDate: isoDate(end),
    proposedMonthlyRent: String(lease.monthlyRent),
    proposedSecurityDeposit: String(lease.securityDeposit),
    proposedRentDueDay: String(lease.rentDueDay),
    proposedGracePeriodDays: String(lease.gracePeriodDays),
    proposedLateFeeAmount: String(lease.lateFeeAmount),
    offerExpiresAt: `${isoDate(expires)}T17:00`,
    internalNotes: "",
  };
}

export function LeaseRenewalPanel({
  lease,
  onUpdated,
}: {
  lease: LeaseLifecycle;
  onUpdated: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => defaults(lease));
  const [busy, setBusy] = useState(false);
  const latest = lease.renewals[0] ?? null;
  const hasOpen = latest && ["DRAFT", "SIGNING"].includes(latest.status);
  const title = useMemo(
    () => (latest ? `Offer ${statusLabel(latest.status)}` : "No renewal offer"),
    [latest],
  );

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/lease-lifecycle/leases/${lease.id}/renewals`, {
        ...form,
        proposedMonthlyRent: Number(form.proposedMonthlyRent),
        proposedSecurityDeposit: Number(form.proposedSecurityDeposit),
        proposedRentDueDay: Number(form.proposedRentDueDay),
        proposedGracePeriodDays: Number(form.proposedGracePeriodDays),
        proposedLateFeeAmount: Number(form.proposedLateFeeAmount),
        offerExpiresAt: new Date(form.offerExpiresAt).toISOString(),
      });
      toast.success("Renewal draft prepared");
      setShowForm(false);
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to prepare renewal"));
    } finally {
      setBusy(false);
    }
  }

  async function action(
    endpoint: string,
    method: "post" | "delete",
    success: string,
  ) {
    setBusy(true);
    try {
      await api[method](endpoint, method === "post" ? {} : undefined);
      toast.success(success);
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update renewal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <FileSignature className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Lease renewal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepare terms, send through Verdocs, and activate signed terms on
              their effective date.
            </p>
          </div>
        </div>
        {!hasOpen && lease.status !== "terminated" ? (
          <Button
            onClick={() => {
              setForm(defaults(lease));
              setShowForm(true);
            }}
          >
            <CalendarPlus /> New offer
          </Button>
        ) : null}
      </div>

      {latest ? (
        <div className="mt-6 rounded-xl border border-border bg-secondary/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {shortDate(latest.proposedStartDate)} –{" "}
                {shortDate(latest.proposedEndDate)} ·{" "}
                {money(latest.proposedMonthlyRent)}/month
              </p>
            </div>
            <Badge className="capitalize">{statusLabel(latest.status)}</Badge>
          </div>
          {latest.status === "DRAFT" ? (
            <div className="mt-4 flex gap-3">
              <Button
                disabled={busy}
                onClick={() =>
                  action(
                    `/admin/lease-lifecycle/renewals/${latest.id}/send`,
                    "post",
                    "Renewal sent for signature",
                  )
                }
              >
                <Send /> Send for signature
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  action(
                    `/admin/lease-lifecycle/renewals/${latest.id}`,
                    "delete",
                    "Renewal canceled",
                  )
                }
              >
                <X /> Cancel draft
              </Button>
            </div>
          ) : null}
          {latest.status === "SIGNING" ? (
            <Button
              className="mt-4"
              variant="outline"
              disabled={busy}
              onClick={() =>
                action(
                  `/admin/lease-lifecycle/renewals/${latest.id}`,
                  "delete",
                  "Renewal canceled",
                )
              }
            >
              <X /> Cancel signing request
            </Button>
          ) : null}
          {latest.signedAt ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Signed {shortDate(latest.signedAt)}
              {latest.activatedAt
                ? ` · terms activated ${shortDate(latest.activatedAt)}`
                : " · terms activate automatically on the renewal start date"}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No renewal has been prepared for this lease.
        </p>
      )}

      {showForm ? (
        <form className="mt-6 border-t border-border pt-6" onSubmit={create}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Renewal starts">
              <Input
                type="date"
                value={form.proposedStartDate}
                onChange={(e) =>
                  setForm({ ...form, proposedStartDate: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Renewal ends">
              <Input
                type="date"
                value={form.proposedEndDate}
                onChange={(e) =>
                  setForm({ ...form, proposedEndDate: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Monthly rent">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.proposedMonthlyRent}
                onChange={(e) =>
                  setForm({ ...form, proposedMonthlyRent: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Security deposit">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.proposedSecurityDeposit}
                onChange={(e) =>
                  setForm({ ...form, proposedSecurityDeposit: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Rent due day">
              <Input
                type="number"
                min="1"
                max="28"
                value={form.proposedRentDueDay}
                onChange={(e) =>
                  setForm({ ...form, proposedRentDueDay: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Grace days">
              <Input
                type="number"
                min="0"
                max="30"
                value={form.proposedGracePeriodDays}
                onChange={(e) =>
                  setForm({ ...form, proposedGracePeriodDays: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Late fee">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.proposedLateFeeAmount}
                onChange={(e) =>
                  setForm({ ...form, proposedLateFeeAmount: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Response deadline">
              <Input
                type="datetime-local"
                value={form.offerExpiresAt}
                onChange={(e) =>
                  setForm({ ...form, offerExpiresAt: e.target.value })
                }
                required
              />
            </Field>
          </div>
          <div className="mt-5">
            <Label htmlFor="renewal-notes">Internal notes</Label>
            <Textarea
              id="renewal-notes"
              className="mt-2"
              value={form.internalNotes}
              onChange={(e) =>
                setForm({ ...form, internalNotes: e.target.value })
              }
            />
          </div>
          <div className="mt-5 flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />}{" "}
              Save draft
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
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
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
