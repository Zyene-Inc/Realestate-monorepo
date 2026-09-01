"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { MaintenanceManagementDialog } from "./_components/maintenance-management-dialog";
import { MaintenanceRequestTable } from "./_components/maintenance-request-table";
import {
  MAINTENANCE_STATUSES,
  MaintenanceRequest,
  OwnerExpensePage,
  Vendor,
} from "./_components/maintenance-types";
import { OwnerExpenseLedger } from "./_components/owner-expense-ledger";

const emptyExpensePage: OwnerExpensePage = {
  summary: { total: "0.00", entryCount: 0 },
  items: [],
  nextCursor: null,
};

export default function AdminMaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<OwnerExpensePage>(emptyExpensePage);
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    const [nextRequests, nextVendors, nextExpenses] = await Promise.all([
      api.get("/admin/maintenance?limit=100") as Promise<MaintenanceRequest[]>,
      api.get("/admin/vendors") as Promise<Vendor[]>,
      api.get(
        "/admin/maintenance/expenses?limit=50",
      ) as Promise<OwnerExpensePage>,
    ]);
    setRequests(nextRequests);
    setVendors(nextVendors);
    setExpenses(nextExpenses);
    const requestedId = new URLSearchParams(window.location.search).get("id");
    if (requestedId) {
      setSelected(
        nextRequests.find((request) => request.id === requestedId) ?? null,
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api.get("/admin/maintenance?limit=100") as Promise<MaintenanceRequest[]>,
      api.get("/admin/vendors") as Promise<Vendor[]>,
      api.get(
        "/admin/maintenance/expenses?limit=50",
      ) as Promise<OwnerExpensePage>,
    ])
      .then(([nextRequests, nextVendors, nextExpenses]) => {
        if (!active) return;
        setRequests(nextRequests);
        setVendors(nextVendors);
        setExpenses(nextExpenses);
        const requestedId = new URLSearchParams(window.location.search).get(
          "id",
        );
        if (requestedId) {
          setSelected(
            nextRequests.find((request) => request.id === requestedId) ?? null,
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(
            getErrorMessage(error, "Unable to load maintenance operations"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (status !== "all" && request.status !== status) return false;
      if (!term) return true;
      return [
        request.category,
        request.description,
        request.tenant.firstName,
        request.tenant.lastName,
        request.property.name,
        request.property.address,
        request.unit.unitNumber,
        request.vendor?.name,
        request.vendor?.companyName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [query, requests, status]);

  const metrics = useMemo(() => {
    const open = requests.filter(
      (request) => !["completed", "tenant_confirmed"].includes(request.status),
    );
    return {
      open: open.length,
      emergencies: open.filter((request) => request.priority === "emergency")
        .length,
      scheduled: open.filter((request) => request.status === "scheduled")
        .length,
      awaitingCost: requests.filter(
        (request) => request.status === "in_progress" && request.cost === null,
      ).length,
    };
  }, [requests]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      toast.success("Maintenance operations refreshed");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to refresh maintenance operations"),
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function saved(updated: MaintenanceRequest) {
    setRequests((current) =>
      current.map((request) => (request.id === updated.id ? updated : request)),
    );
    setExpenses(
      (await api.get(
        "/admin/maintenance/expenses?limit=50",
      )) as OwnerExpensePage,
    );
  }

  async function loadMoreExpenses() {
    if (!expenses.nextCursor) return;
    setLoadingMore(true);
    try {
      const next = (await api.get(
        `/admin/maintenance/expenses?limit=50&cursor=${encodeURIComponent(expenses.nextCursor)}`,
      )) as OwnerExpensePage;
      setExpenses({
        summary: next.summary,
        items: [...expenses.items, ...next.items],
        nextCursor: next.nextCursor,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load more owner expenses"));
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading maintenance operations">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            Service operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Maintenance
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Assign vendors, schedule work, document costs, and keep every owner
            expense traceable from the original resident request.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          Refresh
        </Button>
      </header>

      <section
        aria-label="Maintenance summary"
        className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          { label: "Open requests", value: metrics.open, icon: Wrench },
          {
            label: "Emergencies",
            value: metrics.emergencies,
            icon: AlertTriangle,
          },
          { label: "Scheduled", value: metrics.scheduled, icon: CalendarClock },
          {
            label: "Awaiting final cost",
            value: metrics.awaitingCost,
            icon: Loader2,
          },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between gap-4 p-5 ${index ? "border-t border-border sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 xl:border-l" : ""}`}
          >
            <div>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {metric.value}
              </p>
            </div>
            <metric.icon className="size-5 text-primary" aria-hidden="true" />
          </div>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="service-request-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="service-request-title" className="text-xl font-semibold">
              Service requests
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} of {requests.length} requests shown
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-80">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search maintenance requests"
                className="pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search resident, property, issue, or vendor"
              />
            </div>
            <select
              aria-label="Filter maintenance workflow status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All workflow statuses</option>
              {MAINTENANCE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <MaintenanceRequestTable requests={filtered} onManage={setSelected} />
      </section>

      <OwnerExpenseLedger
        page={expenses}
        loadingMore={loadingMore}
        onLoadMore={loadMoreExpenses}
      />

      {selected ? (
        <MaintenanceManagementDialog
          key={selected.id}
          request={selected}
          vendors={vendors}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onSaved={saved}
        />
      ) : null}
    </div>
  );
}
