"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  shortDate,
  statusLabel,
  type LeaseLifecycle,
} from "@/lib/lease-lifecycle";
import { LeaseRenewalPanel } from "./lease-renewal-panel";
import { MoveOutPanel } from "./move-out-panel";

export function LeaseLifecycleWorkspace() {
  const searchParams = useSearchParams();
  const [leases, setLeases] = useState<LeaseLifecycle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (preferredId?: string) => {
      try {
        const result = (await api.get(
          "/admin/lease-lifecycle?limit=200",
        )) as LeaseLifecycle[];
        setLeases(result);
        setSelectedId(
          (current) =>
            preferredId ||
            searchParams.get("lease") ||
            current ||
            result[0]?.id ||
            "",
        );
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to load lease lifecycles"));
      } finally {
        setLoading(false);
      }
    },
    [searchParams],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const selected = useMemo(
    () => leases.find((lease) => lease.id === selectedId) ?? null,
    [leases, selectedId],
  );

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Resident lifecycle
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Renewals and move-outs
          </h1>
          <p className="mt-3 text-muted-foreground">
            Offer and sign renewals, record notice, complete final condition and
            key handover, itemize the deposit, and retain proof of return.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load(selectedId)}>
          <RefreshCw /> Refresh
        </Button>
      </header>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6">
        <label htmlFor="lifecycle-lease" className="text-sm font-semibold">
          Resident and current lease
        </label>
        <select
          id="lifecycle-lease"
          className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.tenant.firstName} {lease.tenant.lastName} ·{" "}
              {lease.unit.property.name} · Unit {lease.unit.unitNumber} · ends{" "}
              {shortDate(lease.endDate)}
            </option>
          ))}
        </select>
      </section>

      {!selected ? (
        <section className="rounded-[1.25rem] border border-dashed p-12 text-center text-muted-foreground">
          No current or recently completed rental leases are available.
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Summary
              icon={ShieldCheck}
              label="Resident"
              value={`${selected.tenant.firstName} ${selected.tenant.lastName}`}
              detail={selected.tenant.email}
            />
            <Summary
              icon={CalendarClock}
              label="Current term"
              value={`${shortDate(selected.startDate)} – ${shortDate(selected.endDate)}`}
              detail={`Lease ${statusLabel(selected.status)}`}
            />
            <Summary
              icon={ShieldCheck}
              label="Occupancy"
              value={`${selected.unit.property.name} · ${selected.unit.unitNumber}`}
              detail={`Unit ${statusLabel(selected.unit.status)}`}
            />
          </section>
          <LeaseRenewalPanel
            lease={selected}
            onUpdated={() => load(selected.id)}
          />
          <MoveOutPanel lease={selected} onUpdated={() => load(selected.id)} />
        </>
      )}
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-4 font-semibold">{value}</p>
      <div className="mt-2">
        <Badge variant="secondary" className="capitalize">
          {detail}
        </Badge>
      </div>
    </div>
  );
}
