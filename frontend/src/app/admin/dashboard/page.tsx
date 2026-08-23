"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Building2, DoorOpen, Eye, Loader2, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/page-header";
import { PortalMetric } from "@/components/portal/metric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type Dashboard = {
  metrics: {
    properties: number;
    published: number;
    units: number;
    occupiedUnits: number;
    activeTenants: number;
    openMaintenance: number;
  };
  recentMaintenance: Array<{
    id: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    tenant: { firstName: string; lastName: string };
    unit: { unitNumber: string };
    property: { name: string };
  }>;
  upcomingLeases: Array<{
    id: string;
    endDate: string;
    tenant: { firstName: string; lastName: string };
    unit: { unitNumber: string; property: { name: string } };
  }>;
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    api
      .get("/admin/rental-dashboard")
      .then((value: Dashboard) => setDashboard(value))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load rental overview")),
      );
  }, []);

  if (!dashboard) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const occupancy = dashboard.metrics.units
    ? Math.round(
        (dashboard.metrics.occupiedUnits / dashboard.metrics.units) * 100,
      )
    : 0;
  const metrics = [
    [
      "Rental properties",
      dashboard.metrics.properties,
      `${dashboard.metrics.published} published`,
      Building2,
    ],
    ["Units", dashboard.metrics.units, `${occupancy}% occupied`, DoorOpen],
    [
      "Active residents",
      dashboard.metrics.activeTenants,
      "Current tenant accounts",
      Users,
    ],
    [
      "Open service",
      dashboard.metrics.openMaintenance,
      "Requests needing attention",
      Wrench,
    ],
    [
      "Public rentals",
      dashboard.metrics.published,
      "Visible on the public site",
      Eye,
    ],
  ] as const;

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Rental operations"
        title="Portfolio overview"
        description="Live inventory, resident, lease, and service information from the rental system."
      />
      <section aria-labelledby="rental-metrics">
        <h2 id="rental-metrics" className="sr-only">
          Rental metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value, detail, icon]) => (
            <PortalMetric
              key={label}
              label={label}
              value={String(value)}
              detail={detail}
              icon={icon}
            />
          ))}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-5">
            <CardTitle>Recent service requests</CardTitle>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href="/admin/maintenance" />}
            >
              Open maintenance
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {dashboard.recentMaintenance.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No service requests have been submitted.
              </p>
            ) : (
              dashboard.recentMaintenance.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-4 px-5 py-4 sm:px-6"
                >
                  <span
                    className={`mt-1.5 size-2 rounded-full ${request.priority === "emergency" ? "bg-destructive" : request.status === "completed" ? "bg-success" : "bg-accent"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize">
                      {request.category} · {request.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {request.tenant.firstName} {request.tenant.lastName} ·{" "}
                      {request.property.name}, Unit {request.unit.unitNumber}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-5">
            <CardTitle>Leases ending within 60 days</CardTitle>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href="/admin/leases" />}
            >
              Review leases
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {dashboard.upcomingLeases.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No lease decisions are due in the next 60 days.
              </p>
            ) : (
              dashboard.upcomingLeases.map((lease) => (
                <div
                  key={lease.id}
                  className="flex items-center gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {lease.tenant.firstName} {lease.tenant.lastName}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {lease.unit.property.name} · Unit {lease.unit.unitNumber}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-accent">
                    {format(new Date(lease.endDate), "MMM d, yyyy")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
