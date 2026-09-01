"use client";

import { useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
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
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

type LeaseTerms = {
  id: string;
  monthlyRent: number;
  securityDeposit?: number;
  rentDueDay: number;
  gracePeriodDays: number;
  lateFeeAmount: number;
  tenant: { firstName: string; lastName: string };
};

type FormState = {
  monthlyRent: string;
  securityDeposit: string;
  rentDueDay: string;
  gracePeriodDays: string;
  lateFeeAmount: string;
};

function initialForm(lease: LeaseTerms): FormState {
  return {
    monthlyRent: lease.monthlyRent.toFixed(2),
    securityDeposit: (lease.securityDeposit || 0).toFixed(2),
    rentDueDay: String(lease.rentDueDay),
    gracePeriodDays: String(lease.gracePeriodDays),
    lateFeeAmount: lease.lateFeeAmount.toFixed(2),
  };
}

export function LeaseRentPolicyDialog({
  lease,
  onSaved,
  disabled = false,
}: {
  lease: LeaseTerms;
  onSaved: () => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(lease));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/leases/${lease.id}`, {
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
        rentDueDay: Number(form.rentDueDay),
        gracePeriodDays: Number(form.gracePeriodDays),
        lateFeeAmount: Number(form.lateFeeAmount),
      });
      await onSaved();
      toast.success("Lease billing terms updated.");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update lease terms"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setForm(initialForm(lease));
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant="outline" disabled={disabled} />}
      >
        <Settings2 aria-hidden="true" /> Edit terms
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Lease billing terms</DialogTitle>
            <DialogDescription>
              Update the rent policy for {lease.tenant.firstName}{" "}
              {lease.tenant.lastName}. Changes apply to future monthly charges;
              existing payment records stay intact.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`monthly-rent-${lease.id}`}
              label="Monthly rent"
              value={form.monthlyRent}
              min="0"
              step="0.01"
              onChange={(monthlyRent) =>
                setForm((current) => ({ ...current, monthlyRent }))
              }
            />
            <Field
              id={`deposit-${lease.id}`}
              label="Security deposit"
              value={form.securityDeposit}
              min="0"
              step="0.01"
              onChange={(securityDeposit) =>
                setForm((current) => ({ ...current, securityDeposit }))
              }
            />
            <Field
              id={`due-day-${lease.id}`}
              label="Rent due day"
              value={form.rentDueDay}
              min="1"
              max="28"
              step="1"
              onChange={(rentDueDay) =>
                setForm((current) => ({ ...current, rentDueDay }))
              }
            />
            <Field
              id={`grace-days-${lease.id}`}
              label="Grace period (days)"
              value={form.gracePeriodDays}
              min="0"
              max="30"
              step="1"
              onChange={(gracePeriodDays) =>
                setForm((current) => ({ ...current, gracePeriodDays }))
              }
            />
            <Field
              id={`late-fee-${lease.id}`}
              label="Late fee"
              value={form.lateFeeAmount}
              min="0"
              step="0.01"
              onChange={(lateFeeAmount) =>
                setForm((current) => ({ ...current, lateFeeAmount }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Save billing terms
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  max?: string;
  step: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}
