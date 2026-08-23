"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AuditEvent,
  AuditEventPage,
  OwnerReportPage,
  OwnerReportRow,
  ReportOverview,
} from "@/lib/reports";
import {
  AuditTimeline,
  FinancialSummary,
  OperationsOverview,
  OwnerTable,
  ReportHeader,
} from "./_components/report-sections";

const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getUTCFullYear()}-01-01`;
function reportQuery(from: string, to: string) {
  return new URLSearchParams({ from, to }).toString();
}

type ReportsState = {
  from: string;
  to: string;
  overview: ReportOverview | null;
  owners: OwnerReportRow[];
  ownerCursor: string | null;
  auditEvents: AuditEvent[];
  auditCursor: string | null;
  actionFilter: string;
  resourceFilter: string;
  appliedActionFilter: string;
  appliedResourceFilter: string;
  loading: boolean;
  loadingOwners: boolean;
  loadingAudit: boolean;
};

function reportsReducer(state: ReportsState, changes: Partial<ReportsState>) {
  return { ...state, ...changes };
}

export default function AdminReportsPage() {
  const [state, update] = useReducer(reportsReducer, undefined, () => ({
    from: yearStart(),
    to: today(),
    overview: null,
    owners: [],
    ownerCursor: null,
    auditEvents: [],
    auditCursor: null,
    actionFilter: "",
    resourceFilter: "",
    appliedActionFilter: "",
    appliedResourceFilter: "",
    loading: true,
    loadingOwners: false,
    loadingAudit: false,
  }));
  const {
    from,
    to,
    overview,
    owners,
    ownerCursor,
    auditEvents,
    auditCursor,
    actionFilter,
    resourceFilter,
    appliedActionFilter,
    appliedResourceFilter,
    loading,
    loadingOwners,
    loadingAudit,
  } = state;

  const query = useMemo(() => reportQuery(from, to), [from, to]);
  const auditQuery = useCallback(
    (cursor?: string) => {
      const parameters = new URLSearchParams({ from, to, limit: "25" });
      if (appliedActionFilter.trim()) {
        parameters.set("action", appliedActionFilter.trim().toUpperCase());
      }
      if (appliedResourceFilter.trim()) {
        parameters.set("resource", appliedResourceFilter.trim().toLowerCase());
      }
      if (cursor) parameters.set("cursor", cursor);
      return parameters.toString();
    },
    [appliedActionFilter, appliedResourceFilter, from, to],
  );

  const load = useCallback(async () => {
    update({ loading: true });
    try {
      const [nextOverview, ownerPage, auditPage] = await Promise.all([
        api.get(`/admin/reports/overview?${query}`) as Promise<ReportOverview>,
        api.get(
          `/admin/reports/owners?${query}&limit=25`,
        ) as Promise<OwnerReportPage>,
        api.get(`/admin/audit-logs?${auditQuery()}`) as Promise<AuditEventPage>,
      ]);
      update({
        overview: nextOverview,
        owners: ownerPage.items,
        ownerCursor: ownerPage.nextCursor,
        auditEvents: auditPage.items,
        auditCursor: auditPage.nextCursor,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load company reports"));
    } finally {
      update({ loading: false });
    }
  }, [auditQuery, query]);

  useEffect(() => {
    let ignore = false;
    void Promise.all([
      api.get(`/admin/reports/overview?${query}`) as Promise<ReportOverview>,
      api.get(
        `/admin/reports/owners?${query}&limit=25`,
      ) as Promise<OwnerReportPage>,
      api.get(`/admin/audit-logs?${auditQuery()}`) as Promise<AuditEventPage>,
    ])
      .then(([nextOverview, ownerPage, auditPage]) => {
        if (ignore) return;
        update({
          overview: nextOverview,
          owners: ownerPage.items,
          ownerCursor: ownerPage.nextCursor,
          auditEvents: auditPage.items,
          auditCursor: auditPage.nextCursor,
        });
      })
      .catch((error: unknown) => {
        if (!ignore) {
          toast.error(getErrorMessage(error, "Unable to load company reports"));
        }
      })
      .finally(() => {
        if (!ignore) update({ loading: false });
      });
    return () => {
      ignore = true;
    };
  }, [auditQuery, query]);

  async function loadMoreOwners() {
    if (!ownerCursor) return;
    update({ loadingOwners: true });
    try {
      const page = (await api.get(
        `/admin/reports/owners?${query}&limit=25&cursor=${encodeURIComponent(ownerCursor)}`,
      )) as OwnerReportPage;
      update({
        owners: [...owners, ...page.items],
        ownerCursor: page.nextCursor,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load more owners"));
    } finally {
      update({ loadingOwners: false });
    }
  }

  async function loadMoreAudit() {
    if (!auditCursor) return;
    update({ loadingAudit: true });
    try {
      const page = (await api.get(
        `/admin/audit-logs?${auditQuery(auditCursor)}`,
      )) as AuditEventPage;
      update({
        auditEvents: [...auditEvents, ...page.items],
        auditCursor: page.nextCursor,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load more audit events"));
    } finally {
      update({ loadingAudit: false });
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-label="Loading reports"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 sm:p-8">
      <ReportHeader
        from={from}
        to={to}
        owners={owners}
        loading={loading}
        onFrom={(value) => update({ from: value })}
        onTo={(value) => update({ to: value })}
        onRefresh={load}
      />

      {overview ? (
        <>
          <FinancialSummary overview={overview} />
          <OperationsOverview overview={overview} />

          <OwnerTable
            owners={owners}
            cursor={ownerCursor}
            loadingMore={loadingOwners}
            onLoadMore={loadMoreOwners}
          />

          <AuditTimeline
            events={auditEvents}
            cursor={auditCursor}
            actionFilter={actionFilter}
            resourceFilter={resourceFilter}
            loadingMore={loadingAudit}
            onActionFilter={(value) => update({ actionFilter: value })}
            onResourceFilter={(value) => update({ resourceFilter: value })}
            onApply={() => {
              update({
                appliedActionFilter: actionFilter,
                appliedResourceFilter: resourceFilter,
              });
            }}
            onLoadMore={loadMoreAudit}
          />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <CalendarDays className="size-8 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              Reports are unavailable
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Check the selected date range and try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
