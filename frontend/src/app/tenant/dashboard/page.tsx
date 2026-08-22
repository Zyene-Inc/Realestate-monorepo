"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { differenceInDays, format } from "date-fns";
import { ArrowUpRight, Calendar, CreditCard, FileText, Megaphone, Wrench } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { PortalMetric } from "@/components/portal/metric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DashboardData = {
  firstName?: string;
  unit?: { unitNumber: string; property: { name: string } } | null;
  leases: { monthlyRent: number; endDate: string }[];
  maintenanceRequests: { id: string; description: string; priority: string; status: string; createdAt: string }[];
  payments: { id: string; dueDate: string; totalAmount: number; paymentMethod?: string | null; status: string }[];
};

export default function TenantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/tenant/portal/dashboard").then((value: DashboardData) => setData(value)).catch((error: unknown) => toast.error(getErrorMessage(error, "Unable to load your resident overview"))).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-8"><Skeleton className="h-24 w-full max-w-2xl" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-40 rounded-[1.25rem]" />)}</div><Skeleton className="h-80 rounded-[1.25rem]" /></div>;

  const activeLease = data?.leases?.[0];
  const rentDue = activeLease?.monthlyRent || 0;
  const daysUntilRenewal = activeLease ? Math.max(0, differenceInDays(new Date(activeLease.endDate), new Date())) : 0;
  const requests = data?.maintenanceRequests || [];
  const payments = data?.payments || [];
  const location = data?.unit ? `${data.unit.property.name} / Unit ${data.unit.unitNumber}` : "Resident account";

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader eyebrow={location} title={`Welcome back, ${data?.firstName || "resident"}`} description="Your rent, lease, documents, service requests, and property messages are gathered here." actions={<div className="inline-flex min-h-11 items-center gap-3 rounded-full border border-border bg-card px-4 text-sm"><span className="size-2 rounded-full bg-success" aria-hidden="true" /><span className="font-semibold">Account verified</span></div>} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resident overview">
        <Card className="border-primary/20 bg-primary text-primary-foreground"><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between"><p className="text-xs text-primary-foreground/70">Monthly rent</p><CreditCard className="size-5 text-primary-foreground/70" aria-hidden="true" /></div><p className="mt-4 text-3xl font-semibold tracking-[-0.04em] tabular-nums">${rentDue.toLocaleString()}</p><p className="mt-2 text-xs text-primary-foreground/65">Due on the first of each month</p><Button nativeButton={false} className="mt-6 w-full" render={<Link href="/tenant/pay-rent" />}>Make a payment<ArrowUpRight aria-hidden="true" /></Button></CardContent></Card>
        <PortalMetric label="Open service requests" value={String(requests.length)} detail={requests[0]?.description || "No active requests"} icon={Wrench} />
        <PortalMetric label="Lease remaining" value={`${daysUntilRenewal}`} detail={activeLease ? "Days until the current term ends" : "No active lease on file"} icon={FileText} />
        <PortalMetric label="Unread notices" value="0" detail="You are up to date" icon={Megaphone} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-5"><CardTitle>Recent payments</CardTitle><Link href="/tenant/payments" className="text-xs font-semibold text-primary hover:underline">Payment history</Link></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {payments.length === 0 ? <div className="px-6 py-12 text-center"><CreditCard className="mx-auto size-9 text-muted-foreground/45" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">No payment records yet.</p></div> : payments.map((payment) => <div key={payment.id} className="flex items-center gap-4 px-5 py-4 sm:px-6"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><CreditCard className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Rent / {format(new Date(payment.dueDate), "MMMM yyyy")}</p><p className="mt-1 truncate text-xs text-muted-foreground">Ref {payment.id.slice(-8).toUpperCase()} / {payment.paymentMethod || "Bank transfer"}</p></div><div className="text-right"><p className="text-sm font-semibold tabular-nums">${payment.totalAmount.toLocaleString()}</p><span className={cn("mt-1 inline-block text-xs font-medium", payment.status === "PAID" ? "text-success" : "text-warning-foreground")}>{payment.status.toLowerCase()}</span></div></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-5"><CardTitle>Service updates</CardTitle><Link href="/tenant/maintenance" className="text-xs font-semibold text-primary hover:underline">All requests</Link></CardHeader>
          <CardContent className="p-5 sm:p-6">
            {requests.length === 0 ? <div className="py-8 text-center"><Wrench className="mx-auto size-9 text-muted-foreground/45" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Nothing needs attention</p><p className="mt-1 text-xs text-muted-foreground">There are no open service requests.</p></div> : <div className="space-y-5">{requests.slice(0, 3).map((request) => <div key={request.id} className="border-b border-border pb-5 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", request.priority.toLowerCase() === "emergency" || request.priority.toLowerCase() === "high" ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground")}>{request.priority}</span><span className="text-xs text-muted-foreground">{format(new Date(request.createdAt), "MMM d")}</span></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{request.description}</p><p className="mt-2 text-xs font-semibold text-primary">{request.status}</p></div>)}</div>}
            <Button nativeButton={false} variant="outline" className="mt-6 w-full" render={<Link href="/tenant/maintenance" />}><Wrench aria-hidden="true" />New service request</Button>
          </CardContent>
        </Card>
      </section>

      {activeLease ? <section className="flex flex-col gap-5 border-y border-border py-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Calendar className="mt-0.5 size-5 text-primary" aria-hidden="true" /><div><h2 className="text-base font-semibold">Current lease term</h2><p className="mt-1 text-sm text-muted-foreground">Ends {format(new Date(activeLease.endDate), "MMMM d, yyyy")}</p></div></div><Button nativeButton={false} variant="outline" render={<Link href="/tenant/lease" />}>Review lease</Button></section> : null}
    </div>
  );
}
