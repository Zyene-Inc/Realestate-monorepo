"use client";

import Image from "next/image";
import { useMemo } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Pencil,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  MaintenanceRequest,
  maintenanceStatusLabel,
} from "./maintenance-types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const shortDate = new Intl.DateTimeFormat("en-US");
const scheduledDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function maintenanceDateLabels(requests: MaintenanceRequest[]) {
  return new Map(
    requests.map((request) => [
      request.id,
      {
        opened: shortDate.format(new Date(request.createdAt)),
        scheduled: request.scheduledDate
          ? scheduledDateTime.format(new Date(request.scheduledDate))
          : "Not scheduled",
      },
    ]),
  );
}

function statusStyle(status: string) {
  if (["completed", "tenant_confirmed"].includes(status)) {
    return "border-success/25 bg-success/10 text-success";
  }
  if (["scheduled", "in_progress"].includes(status)) {
    return "border-primary/25 bg-primary/10 text-primary";
  }
  return "border-border bg-secondary text-foreground";
}

export function MaintenanceRequestTable({
  requests,
  onManage,
}: {
  requests: MaintenanceRequest[];
  onManage: (request: MaintenanceRequest) => void;
}) {
  const dateLabels = useMemo(
    () => maintenanceDateLabels(requests),
    [requests],
  );
  if (!requests.length) {
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <h2 className="text-lg font-semibold">
            No matching service requests
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Adjust the search or workflow filter to see other requests.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Resident and property</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Vendor and schedule</TableHead>
              <TableHead>Financial</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="align-top">
                  <div className="flex min-w-64 gap-3">
                    {request.photoUrls[0] ? (
                      <Image
                        src={request.photoUrls[0]}
                        alt=""
                        width={64}
                        height={56}
                        className="h-14 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-medium text-muted-foreground">
                        No photo
                      </div>
                    )}
                    <div>
                      <p className="font-semibold capitalize">
                        {request.category}
                      </p>
                      <p className="mt-1 line-clamp-2 max-w-64 text-xs leading-5 text-muted-foreground">
                        {request.description}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-2 capitalize",
                          request.priority === "emergency" &&
                            "border-destructive/30 bg-destructive/10 text-destructive",
                        )}
                      >
                        {request.priority}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <p className="flex items-center gap-2 font-medium">
                    <UserRound
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {request.tenant.firstName} {request.tenant.lastName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.property.name}, unit {request.unit.unitNumber}
                  </p>
                  <p className="mt-1 max-w-56 text-xs text-muted-foreground">
                    {request.property.address}
                  </p>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant="outline"
                    className={statusStyle(request.status)}
                  >
                    {maintenanceStatusLabel(request.status)}
                  </Badge>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Opened {dateLabels.get(request.id)?.opened}
                  </p>
                </TableCell>
                <TableCell className="align-top">
                  <p className="font-medium">
                    {request.vendor?.companyName ??
                      request.vendor?.name ??
                      "Not assigned"}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="size-4" aria-hidden="true" />
                    {dateLabels.get(request.id)?.scheduled}
                  </p>
                </TableCell>
                <TableCell className="align-top">
                  <p className="flex items-center gap-2 font-medium tabular-nums">
                    <CircleDollarSign
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {request.cost === null
                      ? "Cost pending"
                      : money.format(Number(request.cost))}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Owner ledger:{" "}
                    {money.format(Number(request.ownerExpenseTotal))}
                  </p>
                </TableCell>
                <TableCell className="text-right align-top">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onManage(request)}
                  >
                    <Pencil aria-hidden="true" /> Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
