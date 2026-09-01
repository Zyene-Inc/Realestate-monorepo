"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listAdminRentalApplications,
  type RentalApplicationListItem,
} from "@/lib/admin-rental-applications";
import { getErrorMessage } from "@/lib/errors";
import {
  formatApplicationStatus,
  type RentalApplicationStatus,
} from "@/lib/rental-applications";

const filters: Array<{ label: string; value: RentalApplicationStatus | "" }> = [
  { label: "All", value: "" },
  { label: "New", value: "SUBMITTED" },
  { label: "Fee pending", value: "FEE_PENDING" },
  { label: "Under review", value: "UNDER_REVIEW" },
  { label: "Needs information", value: "NEEDS_INFORMATION" },
  { label: "Approved", value: "APPROVED" },
  { label: "Denied", value: "DENIED" },
];

export default function RentalApplicationsAdminPage() {
  const [items, setItems] = useState<RentalApplicationListItem[]>([]);
  const [status, setStatus] = useState<RentalApplicationStatus | "">("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextCursor?: string) => {
      setLoading(true);
      try {
        const result = await listAdminRentalApplications({
          status: status || undefined,
          search: search.trim() || undefined,
          cursor: nextCursor,
        });
        setItems((current) => (nextCursor ? [...current, ...result.items] : result.items));
        setCursor(result.nextCursor);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Unable to load rental applications"));
      } finally {
        setLoading(false);
      }
    },
    [search, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">Leasing pipeline</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Rental applications
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review applicant details, verify documents, confirm fees, and record a
          clear decision before creating a tenant or lease.
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter applications">
          {filters.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              size="sm"
              variant={status === filter.value ? "default" : "outline"}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search applications"
            className="pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Applicant, email, or property"
          />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" aria-label="Loading" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileSearch className="mx-auto size-10 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">No applications found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New submitted applications will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((application, index) => (
            <Link
              key={application.id}
              href={`/admin/rental-applications/${application.id}`}
              className="grid gap-4 p-5 transition-colors hover:bg-secondary/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">
                    {application.firstName} {application.lastName}
                  </h2>
                  <Badge variant="outline" className="capitalize">
                    {formatApplicationStatus(application.status)}
                  </Badge>
                </div>
                <p className="mt-2 truncate text-sm text-muted-foreground">
                  {application.property.name}
                  {application.unit ? ` · Unit ${application.unit.unitNumber}` : ""}
                  {` · ${application.email}`}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="font-semibold">{application._count.documents} documents</p>
                <p className="mt-1 text-muted-foreground">
                  {application.assignedTo?.email ?? "Unassigned"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {cursor ? (
        <Button variant="outline" disabled={loading} onClick={() => void load(cursor)}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}
