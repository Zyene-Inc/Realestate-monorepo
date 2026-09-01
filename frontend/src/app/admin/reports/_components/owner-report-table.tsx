"use client";

import { Loader2 } from "lucide-react";
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
import type { OwnerReportRow } from "@/lib/reports";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function OwnerReportTable({
  owners,
  cursor,
  loadingMore,
  onLoadMore,
}: {
  owners: OwnerReportRow[];
  cursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Rental revenue by owner</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Historical owner and rate snapshots from each received payment.
            </p>
          </div>
          <Badge variant="outline">Income and expenses</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead className="text-right">Rent received</TableHead>
                <TableHead className="text-right">JR commission</TableHead>
                <TableHead className="text-right">Owner proceeds</TableHead>
                <TableHead className="text-right">Maintenance</TableHead>
                <TableHead className="text-right">Net position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell>
                    <p className="font-medium">
                      {owner.companyName || owner.ownerName || "Unnamed owner"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {owner.contactEmail} · {owner.commissionRate}%
                    </p>
                  </TableCell>
                  <TableCell>
                    {owner.propertyCount} properties · {owner.unitCount} units
                  </TableCell>
                  <TableCell>
                    {owner.occupiedUnitCount}/{owner.unitCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money.format(Number(owner.rentCollected))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money.format(Number(owner.managementCommission))}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money.format(Number(owner.ownerProceeds))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {money.format(Number(owner.maintenanceExpenses))}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money.format(Number(owner.netOwnerPosition))}
                  </TableCell>
                </TableRow>
              ))}
              {owners.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-28 text-center text-muted-foreground"
                  >
                    No property owners have been added.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {cursor && (
          <div className="border-t p-4 text-center">
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={() => void onLoadMore()}
            >
              {loadingMore ? <Loader2 className="animate-spin" /> : null}
              Load more owners
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
