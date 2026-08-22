import Link from "next/link";
import { AlertCircle, ArrowUpRight, Building2, CreditCard, DoorOpen, Megaphone, Users, Wrench } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import { PortalMetric } from "@/components/portal/metric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  ["Properties", "12", "One added this month", Building2],
  ["Units", "156", "98% currently occupied", DoorOpen],
  ["Residents", "148", "Four new move-ins", Users],
  ["Rent collected", "$184,200", "92% of expected revenue", CreditCard],
  ["Open service", "8", "Three need priority review", Wrench],
  ["Past due", "5", "$6,400 outstanding", AlertCircle],
] as const;

const activity = [
  { title: "Rent payment received", detail: "Marcus Bell / Unit A1 / $1,200", time: "2 hours ago", tone: "bg-success" },
  { title: "Service request assigned", detail: "Juniper Row / Unit 305 / Heating", time: "3 hours ago", tone: "bg-warning" },
  { title: "Lease document signed", detail: "Elena Torres / Unit B4", time: "Yesterday", tone: "bg-primary" },
  { title: "New resident invitation accepted", detail: "Andre Lewis / Benton Duplex", time: "Yesterday", tone: "bg-accent" },
];

const renewals = [
  { resident: "Maya Patel", unit: "B4", date: "Sep 21", days: "30 days" },
  { resident: "Darius Cole", unit: "204", date: "Oct 06", days: "45 days" },
  { resident: "Nina Alvarez", unit: "1A", date: "Oct 18", days: "57 days" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader eyebrow="Property operations" title="Portfolio overview" description="The decisions, exceptions, and resident work that need attention today." actions={<div className="inline-flex min-h-11 items-center gap-3 rounded-full border border-border bg-card px-4 text-sm"><span className="size-2 rounded-full bg-success" aria-hidden="true" /><span className="font-semibold">Portfolio healthy</span></div>} />

      <section aria-labelledby="portfolio-metrics"><h2 id="portfolio-metrics" className="sr-only">Portfolio metrics</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value, detail, icon]) => <PortalMetric key={label} label={label} value={value} detail={detail} icon={icon} />)}</div></section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="border-primary/20 bg-primary text-primary-foreground">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/65">Property focus</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Brookside Court</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-foreground/78">The six-unit brick property is fully occupied after a careful rehabilitation. The next work package is focused on courtyard lighting and fall envelope checks.</p>
              <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5 border-t border-primary-foreground/18 pt-6"><div><dt className="text-xs text-primary-foreground/60">Occupied</dt><dd className="mt-1 text-2xl font-semibold">6 / 6</dd></div><div><dt className="text-xs text-primary-foreground/60">Open work orders</dt><dd className="mt-1 text-2xl font-semibold">2</dd></div><div><dt className="text-xs text-primary-foreground/60">Next inspection</dt><dd className="mt-1 text-2xl font-semibold">Sep 04</dd></div></dl>
            </div>
            <Button nativeButton={false} variant="outline" className="border-primary-foreground/30 bg-primary-foreground/8 text-primary-foreground hover:bg-primary-foreground hover:text-primary" render={<Link href="/admin/properties" />}>Open property<ArrowUpRight aria-hidden="true" /></Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col justify-between p-6 sm:p-8">
            <div><span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary"><Megaphone className="size-5" aria-hidden="true" /></span><h2 className="mt-6 text-xl font-semibold tracking-[-0.025em]">Resident update</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Share a building notice, project milestone, or weather advisory.</p></div>
            <Button nativeButton={false} className="mt-8 w-full" render={<Link href="/admin/announcements" />}>Create announcement</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.12fr_.88fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b border-border pb-5"><CardTitle>Recent activity</CardTitle><Link href="/admin/reports" className="text-xs font-semibold text-primary hover:underline">View reporting</Link></CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {activity.map((item) => <div key={item.detail} className="grid grid-cols-[auto_1fr] gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6"><span className={`mt-1.5 size-2 rounded-full sm:mt-0 ${item.tone}`} aria-hidden="true" /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div><p className="col-start-2 text-xs text-muted-foreground sm:col-auto">{item.time}</p></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-5"><CardTitle>Upcoming lease decisions</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border p-0">{renewals.map((renewal) => <div key={renewal.resident} className="flex items-center gap-4 px-5 py-4 sm:px-6"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{renewal.resident}</p><p className="mt-1 text-xs text-muted-foreground">Unit {renewal.unit} / {renewal.date}</p></div><span className="text-xs font-medium text-accent">{renewal.days}</span><Button nativeButton={false} variant="outline" size="sm" render={<Link href="/admin/leases" />}>Review</Button></div>)}</CardContent>
        </Card>
      </section>
    </div>
  );
}
