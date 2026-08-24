import Link from "next/link";
import {
  Building2,
  CreditCard,
  FileText,
  Mail,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const setupAreas = [
  {
    href: "/admin/owners",
    title: "Property owners and payouts",
    description:
      "Set each owner’s management commission and send secure Stripe payout onboarding.",
    icon: CreditCard,
  },
  {
    href: "/admin/tenants",
    title: "Tenant access",
    description: "Invite residents and manage access to the tenant portal.",
    icon: UsersRound,
  },
  {
    href: "/admin/emails",
    title: "Email delivery",
    description:
      "Review delivery history and retry eligible operational messages.",
    icon: Mail,
  },
  {
    href: "/admin/e-signatures",
    title: "E-signatures",
    description:
      "Create and monitor Verdocs lease, disclosure, and agreement envelopes.",
    icon: FileText,
  },
  {
    href: "/admin/reports",
    title: "Reports and audit history",
    description:
      "Review operational reports and the recorded administrative history.",
    icon: ShieldCheck,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <p className="text-sm font-semibold text-primary">Company tools</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Settings and setup
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Use the operational areas below to manage the parts of the company
          workspace that are ready for staff use. Nothing on this page is a
          placeholder control.
        </p>
      </div>

      <Tabs defaultValue="setup">
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="setup">Operational setup</TabsTrigger>
          <TabsTrigger value="profile">Company profile</TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {setupAreas.map((area) => {
              const Icon = area.icon;
              return (
                <Link
                  key={area.href}
                  href={area.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="mt-5 text-lg font-semibold">{area.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {area.description}
                  </p>
                  <span className="mt-5 inline-block text-sm font-semibold text-primary group-hover:underline">
                    Open workspace
                  </span>
                </Link>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" aria-hidden="true" />
                Company profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Coach Johnson Realty’s public website copy, address, and
                branding are maintained through the deployed website
                configuration. Changing those values is intentionally not
                exposed as a misleading in-app form.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
