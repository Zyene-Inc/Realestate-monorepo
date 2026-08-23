"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  Loader2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { CursorPage, ListingInquiry } from "@/lib/inquiries";

type Metrics = {
  pendingAgents: number;
  approvedAgents: number;
  pendingListings: number;
  approvedListings: number;
  openInquiries: number;
};

async function loadAllInquiries() {
  const inquiries: ListingInquiry[] = [];
  let cursor: string | null = null;
  do {
    const query = cursor
      ? `?limit=100&cursor=${encodeURIComponent(cursor)}`
      : "?limit=100";
    const page = (await api.get(
      `/admin/inquiries${query}`,
    )) as CursorPage<ListingInquiry>;
    inquiries.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return inquiries;
}

export default function SalesDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/agents?status=PENDING"),
      api.get("/agents?status=APPROVED"),
      api.get("/admin/sale-listings?status=PENDING_REVIEW"),
      api.get("/admin/sale-listings?status=APPROVED"),
      loadAllInquiries(),
    ])
      .then(
        ([
          pendingAgents,
          approvedAgents,
          pendingListings,
          approvedListings,
          inquiries,
        ]) =>
          setMetrics({
            pendingAgents: pendingAgents.length,
            approvedAgents: approvedAgents.length,
            pendingListings: pendingListings.length,
            approvedListings: approvedListings.length,
            openInquiries: inquiries.filter(
              (item: { status: string }) => item.status === "OPEN",
            ).length,
          }),
      )
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load sales dashboard")),
      );
  }, []);

  if (!metrics)
    return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin" />;

  const cards = [
    {
      label: "Agent applications",
      value: metrics.pendingAgents,
      href: "/admin/agents",
      icon: ClipboardCheck,
    },
    {
      label: "Listings awaiting review",
      value: metrics.pendingListings,
      href: "/admin/listings",
      icon: Building2,
    },
    {
      label: "Approved agent companies",
      value: metrics.approvedAgents,
      href: "/admin/agents",
      icon: ShieldCheck,
    },
    {
      label: "Open buyer inquiries",
      value: metrics.openInquiries,
      href: "/admin/inquiries",
      icon: ClipboardCheck,
    },
    {
      label: "Published sale listings",
      value: metrics.approvedListings,
      href: "/properties",
      icon: Building2,
    },
    {
      label: "Commission ledger",
      value: "Open",
      href: "/admin/sales/commissions",
      icon: ReceiptText,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Buy / Sell administration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Sales operations
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review agent companies and keep sale listings moving through Johnson
          Realty approval.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link href={card.href} key={card.label}>
            <Card className="h-full rounded-2xl transition hover:border-primary/50 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{card.label}</CardTitle>
                <card.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
