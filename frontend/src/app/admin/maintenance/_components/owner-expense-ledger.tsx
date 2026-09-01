"use client";

import { Loader2, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { OwnerExpensePage } from "./maintenance-types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const postedDate = new Intl.DateTimeFormat("en-US");

function ownerExpenseDateLabels(page: OwnerExpensePage) {
  return new Map(
    page.items.map((entry) => [
      entry.id,
      postedDate.format(new Date(entry.occurredAt)),
    ]),
  );
}

export function OwnerExpenseLedger({
  page,
  loadingMore,
  onLoadMore,
}: {
  page: OwnerExpensePage;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
}) {
  const dateLabels = useMemo(() => ownerExpenseDateLabels(page), [page]);
  return (
    <section aria-labelledby="owner-expense-ledger-title">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle
                id="owner-expense-ledger-title"
                className="flex items-center gap-2"
              >
                <ReceiptText
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                Owner expense ledger
              </CardTitle>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Completed maintenance charges and every later correction.
                Entries remain visible instead of rewriting financial history.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Posted maintenance expense
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {money.format(Number(page.summary.total))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {page.summary.entryCount} ledger entr
                {page.summary.entryCount === 1 ? "y" : "ies"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {page.items.length ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[880px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner and property</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.items.map((entry) => {
                    const amount = Number(entry.amount);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <p className="font-medium">
                            {entry.propertyOwner.companyName ??
                              entry.propertyOwner.ownerName ??
                              "Unnamed owner"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.property.name}
                            {entry.unit
                              ? `, unit ${entry.unit.unitNumber}`
                              : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="capitalize">
                            {entry.maintenanceRequest.category}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.vendor?.companyName ??
                              entry.vendor?.name ??
                              "No outside vendor"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>
                            {dateLabels.get(entry.id)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.postedBy?.email ?? "Migration backfill"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.entryType === "CHARGE"
                              ? "Charge"
                              : "Adjustment"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold tabular-nums",
                            amount < 0 && "text-success",
                          )}
                        >
                          {amount < 0 ? "−" : ""}
                          {money.format(Math.abs(amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">No owner expenses posted yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A positive final cost posts here when a maintenance request is
                completed.
              </p>
            </div>
          )}
          {page.nextCursor ? (
            <div className="border-t border-border p-4 text-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void onLoadMore()}
              >
                {loadingMore ? <Loader2 className="animate-spin" /> : null}
                Load more expenses
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
