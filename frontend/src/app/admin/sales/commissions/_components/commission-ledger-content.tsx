import {
  Banknote,
  ChevronDown,
  CircleDollarSign,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  commissionDate,
  commissionMoney,
  type SaleCommission,
  type SaleCommissionReport,
  type SaleCommissionStatus,
} from "@/lib/sale-commissions";

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const today = () => new Date().toISOString().slice(0, 10);

type CommissionLedgerContentProps = {
  report: SaleCommissionReport | null;
  reportFrom: string;
  setReportFrom: (value: string) => void;
  reportTo: string;
  setReportTo: (value: string) => void;
  items: SaleCommission[];
  nextCursor: string | null;
  status: "ALL" | SaleCommissionStatus;
  setStatus: (status: "ALL" | SaleCommissionStatus) => void;
  loading: boolean;
  loadingMore: boolean;
  onCreate: () => void;
  onLoad: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  onOpenDetails: (id: string) => Promise<void>;
};

export function CommissionLedgerContent({
  report,
  reportFrom,
  setReportFrom,
  reportTo,
  setReportTo,
  items,
  nextCursor,
  status,
  setStatus,
  loading,
  loadingMore,
  onCreate,
  onLoad,
  onLoadMore,
  onOpenDetails,
}: CommissionLedgerContentProps) {
  return (
    <>
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
        <Button onClick={() => onCreate()}>
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
                        {monthFormatter.format(new Date(row.month))}
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
              onClick={() => void onLoad()}
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
                    onClick={() => void onOpenDetails(item.id)}
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
                onClick={() => void onLoadMore()}
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
    </>
  );
}
