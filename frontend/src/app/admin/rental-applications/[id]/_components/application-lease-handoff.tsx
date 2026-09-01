"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Circle,
  FileSignature,
  Loader2,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getRentalApplicationHandoffOptions,
  startRentalApplicationHandoff,
  type AdminRentalApplication,
  type RentalApplicationHandoffOptions,
} from "@/lib/admin-rental-applications";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type LeaseForm = {
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  rentDueDay: string;
  gracePeriodDays: string;
  lateFeeAmount: string;
};

function dateInput(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function oneYearTerm(start: string) {
  const end = new Date(`${start}T00:00:00.000Z`);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return dateInput(end);
}

function initialForm(application: AdminRentalApplication): LeaseForm {
  const startDate = dateInput(application.moveInDate);
  const lease = application.handoff?.lease;
  return {
    unitId: lease?.unit.id ?? application.unitId ?? "",
    startDate: lease ? dateInput(lease.startDate) : startDate,
    endDate: lease ? dateInput(lease.endDate) : oneYearTerm(startDate),
    monthlyRent: lease ? String(lease.monthlyRent) : "",
    securityDeposit: lease ? String(lease.securityDeposit) : "",
    rentDueDay: lease ? String(lease.rentDueDay) : "1",
    gracePeriodDays: lease ? String(lease.gracePeriodDays) : "5",
    lateFeeAmount: lease ? String(lease.lateFeeAmount) : "50",
  };
}

function HandoffProgress({
  application,
}: {
  application: AdminRentalApplication;
}) {
  const handoff = application.handoff;
  const stages = [
    {
      label: "Resident invited",
      icon: UserRound,
      complete: Boolean(handoff?.tenantInvitedAt),
    },
    {
      label: "Lease prepared",
      icon: FileSignature,
      complete: Boolean(handoff?.leaseCreatedAt),
    },
    {
      label: "Sent for signature",
      icon: Send,
      complete: Boolean(handoff?.envelopeSentAt),
    },
    {
      label: "Signed and active",
      icon: Check,
      complete: handoff?.status === "SIGNED",
    },
  ];
  const nextStage = stages.findIndex((stage) => !stage.complete);
  return (
    <ol
      className="grid gap-3 sm:grid-cols-4"
      aria-label="Lease handoff progress"
    >
      {stages.map((stage, index) => {
        const Icon = stage.complete
          ? Check
          : index === nextStage
            ? stage.icon
            : Circle;
        return (
          <li key={stage.label} className="flex items-center gap-3 sm:block">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border",
                stage.complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium sm:mt-2">{stage.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function ApplicationLeaseHandoff({
  application,
  onChanged,
}: {
  application: AdminRentalApplication;
  onChanged: () => Promise<void>;
}) {
  const [options, setOptions] =
    useState<RentalApplicationHandoffOptions | null>(null);
  const [form, setForm] = useState(() => initialForm(application));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void getRentalApplicationHandoffOptions(application.id)
      .then((result) => {
        if (!active) return;
        setOptions(result);
        const preferredUnitId =
          application.handoff?.lease?.unit.id ??
          application.handoff?.tenant?.unitId ??
          application.unitId;
        const selected =
          result.units.find((unit) => unit.id === preferredUnitId) ??
          result.units[0];
        if (selected && !application.handoff?.lease) {
          setForm((current) => ({
            ...current,
            unitId: selected.id,
            monthlyRent: String(selected.rentAmount),
            securityDeposit: String(selected.depositAmount),
          }));
        }
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load lease setup")),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    application.handoff?.lease,
    application.handoff?.tenant?.unitId,
    application.id,
    application.unitId,
  ]);

  const role = options?.template?.roles[0];
  const missingFields = useMemo(
    () =>
      role ? (options?.template?.missingFieldsByRole[role.name] ?? []) : [],
    [options, role],
  );
  const ready = Boolean(
    options?.configuration.apiConfigured &&
    options.configuration.webhookConfigured &&
    options.template?.isSendable &&
    role &&
    missingFields.length === 0 &&
    options.units.length,
  );
  const handoff = application.handoff;
  const isFinal = ["ENVELOPE_SENT", "SIGNED"].includes(handoff?.status ?? "");

  const selectUnit = (unitId: string) => {
    const unit = options?.units.find((item) => item.id === unitId);
    setForm((current) => ({
      ...current,
      unitId,
      ...(unit && !handoff?.lease
        ? {
            monthlyRent: String(unit.rentAmount),
            securityDeposit: String(unit.depositAmount),
          }
        : {}),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!options?.template || !role || submitting) return;
    setSubmitting(true);
    try {
      await startRentalApplicationHandoff(application.id, {
        clientRequestId: crypto.randomUUID(),
        unitId: form.unitId,
        startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${form.endDate}T00:00:00.000Z`).toISOString(),
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
        rentDueDay: Number(form.rentDueDay),
        gracePeriodDays: Number(form.gracePeriodDays),
        lateFeeAmount: Number(form.lateFeeAmount),
        templateId: options.template.id,
        recipientRoleName: role.name,
        title: `${application.property.name} residential lease`,
      });
      toast.success("Resident invited and lease sent for signature");
      await onChanged();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to send lease"));
      await onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Move-in handoff
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Prepare and send the lease
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite the approved applicant, reserve the unit, prefill the lease,
            and send it through Verdocs. Occupancy starts only after signing.
          </p>
        </div>
        {handoff?.envelope && (
          <Link
            href="/admin/e-signatures"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          >
            View envelope
          </Link>
        )}
      </div>

      <div className="mt-6 border-y border-border py-5">
        <HandoffProgress application={application} />
      </div>

      {handoff && ["FAILED", "ACTION_REQUIRED"].includes(handoff.status) && (
        <div className="mt-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">Action required</p>
            <p className="mt-1 text-muted-foreground">
              {handoff.failureReason ??
                "Review the lease details and try again."}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2
            className="size-5 animate-spin text-primary"
            aria-label="Loading lease setup"
          />
        </div>
      ) : isFinal ? (
        <div className="mt-5 text-sm leading-6 text-muted-foreground">
          {handoff?.status === "SIGNED"
            ? "The signed package is archived. The lease, resident, and unit are active."
            : `The lease was sent to ${handoff?.tenant?.email ?? application.email}. Verdocs will update this workflow when it is opened and signed.`}
        </div>
      ) : !ready ? (
        <div className="mt-5 rounded-xl bg-muted p-4 text-sm leading-6">
          {!options?.configuration.apiConfigured ||
          !options?.configuration.webhookConfigured
            ? "Verdocs is not fully configured. Add the API credentials, webhook secret, and lease template in the production environment."
            : missingFields.length
              ? `The Verdocs lease template is missing: ${missingFields.join(", ")}.`
              : "No vacant unit is available for this property."}
        </div>
      ) : (
        <form className="mt-6 space-y-6" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="handoff-unit">Rental unit</Label>
              <select
                id="handoff-unit"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={form.unitId}
                disabled={Boolean(handoff?.tenant)}
                onChange={(event) => selectUnit(event.target.value)}
                required
              >
                {options?.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.unitNumber} · ${unit.rentAmount.toLocaleString()}
                    /month
                  </option>
                ))}
              </select>
            </div>
            {(
              [
                ["startDate", "Lease start", "date", "", undefined, undefined],
                ["endDate", "Lease end", "date", "", undefined, undefined],
                [
                  "monthlyRent",
                  "Monthly rent",
                  "number",
                  "0.01",
                  0.01,
                  undefined,
                ],
                [
                  "securityDeposit",
                  "Security deposit",
                  "number",
                  "0.01",
                  0,
                  undefined,
                ],
                ["rentDueDay", "Rent due day", "number", "1", 1, 28],
                [
                  "gracePeriodDays",
                  "Grace period (days)",
                  "number",
                  "1",
                  0,
                  30,
                ],
                ["lateFeeAmount", "Late fee", "number", "0.01", 0, undefined],
              ] as const
            ).map(([field, label, type, step, min, max]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`handoff-${field}`}>{label}</Label>
                <Input
                  id={`handoff-${field}`}
                  type={type}
                  step={step || undefined}
                  min={min}
                  max={max}
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              Template: {options?.template?.name} · Recipient:{" "}
              {application.email}
            </p>
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              {handoff
                ? "Retry and send lease"
                : "Invite resident and send lease"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
