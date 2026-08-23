"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  History,
  Loader2,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  commissionDate,
  commissionMoney,
  type CommissionPaymentMethod,
  type CursorPage,
  type EligibleSaleListing,
  type SaleCommission,
  type SaleCommissionReport,
  type SaleCommissionStatus,
} from "@/lib/sale-commissions";

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

const today = () => new Date().toISOString().slice(0, 10);

type EntryForm = {
  propertyId: string;
  salePrice: string;
  commissionAmount: string;
  receivedAt: string;
  paymentMethod: CommissionPaymentMethod;
  referenceNumber: string;
  notes: string;
};

const emptyEntry = (): EntryForm => ({
  propertyId: "",
  salePrice: "",
  commissionAmount: "",
  receivedAt: today(),
  paymentMethod: "CHECK",
  referenceNumber: "",
  notes: "",
});

function receivedAtIso(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

async function fetchLedgerData(query: string, reportQuery: string) {
  const [page, revenue, sold] = await Promise.all([
    api.get(`/admin/sale-commissions${query}`) as Promise<
      CursorPage<SaleCommission>
    >,
    api.get(
      `/admin/sale-commissions/report${reportQuery}`,
    ) as Promise<SaleCommissionReport>,
    api.get("/admin/sale-commissions/eligible-listings?limit=100") as Promise<
      CursorPage<EligibleSaleListing>
    >,
  ]);
  return { page, revenue, sold };
}

function EventTimeline({ commission }: { commission: SaleCommission }) {
  if (!commission.events?.length) return null;
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <History className="h-4 w-4" /> Audit timeline
      </h3>
      <ol className="space-y-4 border-l pl-5">
        {commission.events.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{event.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {commissionDate(event.createdAt)} · {event.actor.email}
              </span>
            </div>
            {event.reason && (
              <p className="mt-2 text-sm">Reason: {event.reason}</p>
            )}
            {event.type === "CORRECTED" && event.newValue && (
              <p className="mt-1 text-xs text-muted-foreground">
                Updated commission:{" "}
                {commissionMoney(String(event.newValue.commissionAmount ?? 0))}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SaleCommissionLedgerPage() {
  const [items, setItems] = useState<SaleCommission[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [report, setReport] = useState<SaleCommissionReport | null>(null);
  const [eligible, setEligible] = useState<EligibleSaleListing[]>([]);
  const [eligibleCursor, setEligibleCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"ALL" | SaleCommissionStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [entry, setEntry] = useState<EntryForm>(emptyEntry);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SaleCommission | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [correction, setCorrection] = useState<EntryForm>(emptyEntry);
  const [correctionReason, setCorrectionReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [reportFrom, setReportFrom] = useState(
    () => `${new Date().getUTCFullYear()}-01-01`,
  );
  const [reportTo, setReportTo] = useState(today);

  const query = useMemo(
    () => (status === "ALL" ? "?limit=25" : `?limit=25&status=${status}`),
    [status],
  );
  const reportQuery = useMemo(() => {
    const parameters = new URLSearchParams();
    if (reportFrom) parameters.set("from", reportFrom);
    if (reportTo) parameters.set("to", reportTo);
    const serialized = parameters.toString();
    return serialized ? `?${serialized}` : "";
  }, [reportFrom, reportTo]);

  const load = useCallback(async () => {
    try {
      const { page, revenue, sold } = await fetchLedgerData(query, reportQuery);
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setReport(revenue);
      setEligible(sold.items);
      setEligibleCursor(sold.nextCursor);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Unable to load the commission ledger"),
      );
    } finally {
      setLoading(false);
    }
  }, [query, reportQuery]);

  useEffect(() => {
    let ignore = false;
    void fetchLedgerData(query, reportQuery)
      .then(({ page, revenue, sold }) => {
        if (ignore) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setReport(revenue);
        setEligible(sold.items);
        setEligibleCursor(sold.nextCursor);
      })
      .catch((error: unknown) => {
        if (!ignore) {
          toast.error(
            getErrorMessage(error, "Unable to load the commission ledger"),
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [query, reportQuery]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const separator = query.includes("?") ? "&" : "?";
      const page = (await api.get(
        `/admin/sale-commissions${query}${separator}cursor=${encodeURIComponent(nextCursor)}`,
      )) as CursorPage<SaleCommission>;
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load more records"));
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreListings = async () => {
    if (!eligibleCursor) return;
    try {
      const page = (await api.get(
        `/admin/sale-commissions/eligible-listings?limit=100&cursor=${encodeURIComponent(eligibleCursor)}`,
      )) as CursorPage<EligibleSaleListing>;
      setEligible((current) => [...current, ...page.items]);
      setEligibleCursor(page.nextCursor);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load more sold listings"));
    }
  };

  const openDetails = async (id: string) => {
    setDetailOpen(true);
    setSelected(null);
    try {
      setSelected(await api.get(`/admin/sale-commissions/${id}`));
    } catch (error: unknown) {
      setDetailOpen(false);
      toast.error(getErrorMessage(error, "Unable to open this record"));
    }
  };

  const submitEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!entry.propertyId || !entry.commissionAmount || !entry.receivedAt) {
      toast.error("Choose a sold listing and enter the receipt details");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/sale-commissions", {
        clientRequestId: requestId,
        propertyId: entry.propertyId,
        salePrice: entry.salePrice || undefined,
        commissionAmount: entry.commissionAmount,
        receivedAt: receivedAtIso(entry.receivedAt),
        paymentMethod: entry.paymentMethod,
        referenceNumber: entry.referenceNumber || undefined,
        notes: entry.notes || undefined,
      });
      toast.success("Commission receipt recorded");
      setCreateOpen(false);
      setEntry(emptyEntry());
      setRequestId(crypto.randomUUID());
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to record commission"));
    } finally {
      setSaving(false);
    }
  };

  const beginCorrection = () => {
    if (!selected) return;
    setCorrection({
      propertyId: selected.propertyId,
      salePrice: selected.salePrice ?? "",
      commissionAmount: selected.commissionAmount,
      receivedAt: selected.receivedAt.slice(0, 10),
      paymentMethod: selected.paymentMethod,
      referenceNumber: selected.referenceNumber ?? "",
      notes: selected.notes ?? "",
    });
    setCorrectionReason("");
    setCorrectOpen(true);
  };

  const submitCorrection = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = (await api.patch(
        `/admin/sale-commissions/${selected.id}/correct`,
        {
          salePrice: correction.salePrice || null,
          commissionAmount: correction.commissionAmount,
          receivedAt: receivedAtIso(correction.receivedAt),
          paymentMethod: correction.paymentMethod,
          referenceNumber: correction.referenceNumber || null,
          notes: correction.notes || null,
          reason: correctionReason,
        },
      )) as SaleCommission;
      setSelected(updated);
      setCorrectOpen(false);
      toast.success("Correction saved to the audit timeline");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to correct this record"));
    } finally {
      setSaving(false);
    }
  };

  const submitVoid = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = (await api.post(
        `/admin/sale-commissions/${selected.id}/void`,
        { reason: voidReason },
      )) as SaleCommission;
      setSelected(updated);
      setVoidOpen(false);
      setVoidReason("");
      toast.success("Commission voided; the history remains preserved");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to void this record"));
    } finally {
      setSaving(false);
    }
  };

  const selectedListing = eligible.find((item) => item.id === entry.propertyId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Buy / Sell revenue
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Commission ledger
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Record commission after closing. Home funds, loans, escrow, and
            buyer payment details stay outside this CRM.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record commission
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Month to date",
            value: report?.summary.monthToDate,
            Icon: TrendingUp,
          },
          {
            label: "Year to date",
            value: report?.summary.yearToDate,
            Icon: CircleDollarSign,
          },
          {
            label: "Selected-range receipts",
            value: report?.summary.commissionAmount,
            Icon: ReceiptText,
          },
          {
            label: "Lifetime recorded",
            value: report?.summary.lifetimeCommission,
            Icon: Banknote,
          },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {report ? commissionMoney(String(value)) : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="report-from">Revenue from</Label>
            <Input
              id="report-from"
              type="date"
              max={reportTo}
              value={reportFrom}
              onChange={(event) => setReportFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">Revenue through</Label>
            <Input
              id="report-to"
              type="date"
              min={reportFrom}
              max={today()}
              value={reportTo}
              onChange={(event) => setReportTo(event.target.value)}
            />
          </div>
          <p className="pb-2 text-sm text-muted-foreground">
            Active receipts in this range: {report?.summary.recordCount ?? 0} ·
            Voided history: {report?.summary.voidedCount ?? 0}
          </p>
        </CardContent>
      </Card>

      {report &&
        (report.byAgent.length > 0 ||
          report.monthly.length > 0 ||
          report.byPaymentMethod.length > 0) && (
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Revenue by agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.byAgent.map((row) => (
                  <div
                    key={row.agent?.id ?? "unknown"}
                    className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {row.agent?.companyName ?? "Unknown agent"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.recordCount} receipt
                        {row.recordCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <strong>{commissionMoney(row.commissionAmount)}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Monthly revenue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.monthly.map((row) => (
                  <div
                    key={row.month}
                    className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(row.month))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.recordCount} receipt
                        {row.recordCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <strong>{commissionMoney(row.commissionAmount)}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Revenue by receipt method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.byPaymentMethod.map((row) => (
                  <div
                    key={row.paymentMethod}
                    className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{row.paymentMethod}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.recordCount} receipt
                        {row.recordCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <strong>{commissionMoney(row.commissionAmount)}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Receipt history</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Active entries count toward revenue; voided entries remain
              auditable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter commission status"
              className={inputClass}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="VOIDED">Voided</option>
            </select>
            <Button
              aria-label="Refresh ledger"
              size="icon"
              variant="outline"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No commission receipts match this view.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => void openDetails(item.id)}
                  >
                    <TableCell>{commissionDate(item.receivedAt)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{item.property.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.property.city}, {item.property.state}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{item.agent.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.agent.contactName}
                      </p>
                    </TableCell>
                    <TableCell>{item.paymentMethod}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "ACTIVE" ? "default" : "outline"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {commissionMoney(item.commissionAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {nextCursor && (
            <div className="border-t p-4 text-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record received commission</DialogTitle>
            <DialogDescription>
              Use only the amount Johnson Realty received. Do not enter buyer
              banking, loan, escrow, or purchase-payment data.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submitEntry}>
            <div className="space-y-2">
              <Label htmlFor="commission-property">Closed sale listing</Label>
              <select
                id="commission-property"
                required
                className={inputClass}
                value={entry.propertyId}
                onChange={(event) => {
                  const propertyId = event.target.value;
                  const listing = eligible.find(
                    (item) => item.id === propertyId,
                  );
                  setEntry((current) => ({
                    ...current,
                    propertyId,
                    salePrice: current.salePrice || listing?.price || "",
                  }));
                }}
              >
                <option value="">Choose a sold property</option>
                {eligible.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.city}, {item.state} —{" "}
                    {item.agent.companyName}
                  </option>
                ))}
              </select>
              {eligibleCursor && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void loadMoreListings()}
                >
                  Load more sold listings
                </Button>
              )}
            </div>
            {selectedListing && (
              <div className="rounded-xl bg-secondary p-4 text-sm">
                <strong>{selectedListing.agent.companyName}</strong>
                <p className="mt-1 text-muted-foreground">
                  Responsible agent: {selectedListing.agent.contactName}.
                  Attribution is taken from the approved listing.
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-price">Final sale price (optional)</Label>
                <Input
                  id="sale-price"
                  inputMode="decimal"
                  placeholder="425000.00"
                  value={entry.salePrice}
                  onChange={(event) =>
                    setEntry((current) => ({
                      ...current,
                      salePrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission-amount">Commission received</Label>
                <Input
                  id="commission-amount"
                  required
                  inputMode="decimal"
                  placeholder="12750.00"
                  value={entry.commissionAmount}
                  onChange={(event) =>
                    setEntry((current) => ({
                      ...current,
                      commissionAmount: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="received-date">Date received</Label>
                <Input
                  id="received-date"
                  required
                  type="date"
                  value={entry.receivedAt}
                  onChange={(event) =>
                    setEntry((current) => ({
                      ...current,
                      receivedAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Receipt method</Label>
                <select
                  id="payment-method"
                  className={inputClass}
                  value={entry.paymentMethod}
                  onChange={(event) =>
                    setEntry((current) => ({
                      ...current,
                      paymentMethod: event.target
                        .value as CommissionPaymentMethod,
                    }))
                  }
                >
                  {["ACH", "CASH", "CHECK", "WIRE", "OTHER"].map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference-number">
                Reference number (optional)
              </Label>
              <Input
                id="reference-number"
                maxLength={100}
                value={entry.referenceNumber}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    referenceNumber: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission-notes">Notes (optional)</Label>
              <Textarea
                id="commission-notes"
                maxLength={2000}
                value={entry.notes}
                onChange={(event) =>
                  setEntry((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          {!selected ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selected.property.name}</DialogTitle>
                  <Badge
                    variant={
                      selected.status === "ACTIVE" ? "default" : "outline"
                    }
                  >
                    {selected.status}
                  </Badge>
                </div>
                <DialogDescription>
                  {selected.property.address}, {selected.property.city},{" "}
                  {selected.property.state} {selected.property.zip}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 rounded-xl bg-secondary/50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Commission received
                  </p>
                  <p className="text-xl font-semibold">
                    {commissionMoney(selected.commissionAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sale price</p>
                  <p className="text-xl font-semibold">
                    {selected.salePrice
                      ? commissionMoney(selected.salePrice)
                      : "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Receipt</p>
                  <p>
                    {commissionDate(selected.receivedAt)} ·{" "}
                    {selected.paymentMethod}
                  </p>
                  {selected.referenceNumber && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {selected.referenceNumber}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agent</p>
                  <p>{selected.agent.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.agent.contactName}
                  </p>
                </div>
              </div>
              {selected.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 text-sm">{selected.notes}</p>
                </div>
              )}
              {selected.status === "VOIDED" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="flex items-center gap-2 font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Voided
                  </p>
                  <p className="mt-1 text-sm">{selected.voidReason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.voidedAt && commissionDate(selected.voidedAt)} ·{" "}
                    {selected.voidedBy?.email}
                  </p>
                </div>
              )}
              <EventTimeline commission={selected} />
              {selected.status === "ACTIVE" && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => setVoidOpen(true)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Void
                  </Button>
                  <Button onClick={beginCorrection}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Correct
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Correct commission record</DialogTitle>
            <DialogDescription>
              The previous values remain in the audit timeline. Listing and
              agent attribution cannot be changed; void and recreate if those
              are wrong.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCorrection}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="correct-sale-price">Sale price</Label>
                <Input
                  id="correct-sale-price"
                  inputMode="decimal"
                  value={correction.salePrice}
                  onChange={(event) =>
                    setCorrection((current) => ({
                      ...current,
                      salePrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correct-commission">Commission received</Label>
                <Input
                  id="correct-commission"
                  required
                  inputMode="decimal"
                  value={correction.commissionAmount}
                  onChange={(event) =>
                    setCorrection((current) => ({
                      ...current,
                      commissionAmount: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="correct-date">Date received</Label>
                <Input
                  id="correct-date"
                  required
                  type="date"
                  value={correction.receivedAt}
                  onChange={(event) =>
                    setCorrection((current) => ({
                      ...current,
                      receivedAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correct-method">Method</Label>
                <select
                  id="correct-method"
                  className={inputClass}
                  value={correction.paymentMethod}
                  onChange={(event) =>
                    setCorrection((current) => ({
                      ...current,
                      paymentMethod: event.target
                        .value as CommissionPaymentMethod,
                    }))
                  }
                >
                  {["ACH", "CASH", "CHECK", "WIRE", "OTHER"].map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct-reference">Reference number</Label>
              <Input
                id="correct-reference"
                maxLength={100}
                value={correction.referenceNumber}
                onChange={(event) =>
                  setCorrection((current) => ({
                    ...current,
                    referenceNumber: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct-notes">Notes</Label>
              <Textarea
                id="correct-notes"
                maxLength={2000}
                value={correction.notes}
                onChange={(event) =>
                  setCorrection((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-reason">Reason for correction</Label>
              <Textarea
                id="correction-reason"
                required
                minLength={3}
                maxLength={500}
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCorrectOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save correction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this commission?</DialogTitle>
            <DialogDescription>
              This removes the amount from revenue totals but preserves the
              original record and complete audit history.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitVoid}>
            <div className="space-y-2">
              <Label htmlFor="void-reason">Reason for void</Label>
              <Textarea
                id="void-reason"
                required
                minLength={3}
                maxLength={500}
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoidOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirm void
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
