"use client";

import Link from "next/link";
import {
  Activity,
  Building2,
  ClipboardCheck,
  Download,
  Home,
  Loader2,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OwnerReportRow, ReportOverview } from "@/lib/reports";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadOwnerReport(rows: OwnerReportRow[], from: string, to: string) {
  const headers = [
    "Owner",
    "Email",
    "Commission rate",
    "Properties",
    "Units",
    "Occupied units",
    "Rent collected",
    "Johnson Realty commission",
    "Owner proceeds",
    "Maintenance expenses",
    "Net owner position",
  ];
  const body = rows.map((row) =>
    [
      row.companyName || row.ownerName || "Unnamed owner",
      row.contactEmail,
      `${row.commissionRate}%`,
      row.propertyCount,
      row.unitCount,
      row.occupiedUnitCount,
      row.rentCollected,
      row.managementCommission,
      row.ownerProceeds,
      row.maintenanceExpenses,
      row.netOwnerPosition,
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob(
    [[headers.map(csvCell).join(","), ...body].join("\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `owner-revenue-${from}-to-${to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof TrendingUp;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function ReportHeader({
  from,
  to,
  owners,
  loading,
  onFrom,
  onTo,
  onRefresh,
}: {
  from: string;
  to: string;
  owners: OwnerReportRow[];
  loading: boolean;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Company administration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Compliance & company reporting
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          One view across sales, rentals, owner attribution, occupancy, approval
          queues, and operational events. Financial figures reflect recorded
          online and offline receipts; no funds move from this screen.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(event) => onFrom(event.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-to">To</Label>
          <Input
            id="report-to"
            type="date"
            value={to}
            onChange={(event) => onTo(event.target.value)}
            className="w-40"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => void onRefresh()}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Refresh
        </Button>
        <Button
          onClick={() => downloadOwnerReport(owners, from, to)}
          disabled={owners.length === 0}
        >
          <Download /> Export owners
        </Button>
      </div>
    </header>
  );
}

export function FinancialSummary({ overview }: { overview: ReportOverview }) {
  const needsAttribution =
    Number(overview.rentRevenue.unassignedCollected) > 0 ||
    overview.rentals.unassignedProperties > 0;
  return (
    <>
      <section aria-labelledby="financial-summary-heading">
        <h2 id="financial-summary-heading" className="sr-only">
          Financial summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Company revenue"
            value={money.format(Number(overview.companyRevenue.combined))}
            detail="Sales commission plus rental management commission"
            icon={TrendingUp}
          />
          <MetricCard
            label="Rent collected"
            value={money.format(Number(overview.rentRevenue.collected))}
            detail={`${overview.rentRevenue.paymentCount} manual rent receipt${overview.rentRevenue.paymentCount === 1 ? "" : "s"}`}
            icon={WalletCards}
          />
          <MetricCard
            label="Owner proceeds"
            value={money.format(Number(overview.rentRevenue.ownerProceeds))}
            detail={`${money.format(Number(overview.rentRevenue.maintenanceExpenses))} in posted maintenance expenses`}
            icon={Building2}
          />
          <MetricCard
            label="Occupancy"
            value={`${overview.rentals.occupancyRate.toFixed(1)}%`}
            detail={`${overview.rentals.occupiedUnits} occupied of ${overview.rentals.units} tracked units`}
            icon={Home}
          />
        </div>
      </section>
      {needsAttribution && (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <strong>Attribution review needed.</strong>{" "}
          {overview.rentals.unassignedProperties} rental propert
          {overview.rentals.unassignedProperties === 1
            ? "y is"
            : "ies are"}{" "}
          missing an owner, and{" "}
          {money.format(Number(overview.rentRevenue.unassignedCollected))} in
          this range is not owner-attributed.
        </div>
      )}
    </>
  );
}

export function OperationsOverview({ overview }: { overview: ReportOverview }) {
  const snapshot = [
    ["Rental properties", overview.rentals.properties],
    ["Published rentals", overview.rentals.publishedProperties],
    ["Vacant units", overview.rentals.vacantUnits],
    ["Maintenance units", overview.rentals.maintenanceUnits],
    ["Sale receipts", overview.saleRevenue.receiptCount],
    ["Audit events", overview.compliance.auditEventCount],
  ] as const;
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="rounded-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5" /> Approval queues
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 p-5 md:grid-cols-2">
          <QueueList
            title="Agents"
            count={overview.queues.pendingAgents}
            href="/admin/agents"
            empty="No pending agent approvals."
            rows={overview.queues.agents.map((agent) => ({
              id: agent.id,
              title: agent.companyName,
              detail: `${agent.contactName} · ${agent.email}`,
            }))}
          />
          <QueueList
            title="Sale listings"
            count={overview.queues.pendingListings}
            href="/admin/listings"
            empty="No sale listings awaiting review."
            rows={overview.queues.listings.map((listing) => ({
              id: listing.id,
              title: listing.name,
              detail: `${listing.address}${listing.agent ? ` · ${listing.agent.companyName}` : ""}`,
            }))}
          />
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" /> Operational snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-5">
          {snapshot.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/60 p-4">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueList({
  title,
  count,
  href,
  empty,
  rows,
}: {
  title: string;
  count: number;
  href: string;
  empty: string;
  rows: Array<{ id: string; title: string; detail: string }>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{count} pending</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <Link
              key={row.id}
              href={href}
              className="block rounded-xl border p-3 transition-colors hover:bg-muted/60"
            >
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
            </Link>
          ))
        ) : (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}
