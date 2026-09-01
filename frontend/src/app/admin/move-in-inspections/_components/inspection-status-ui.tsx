import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  INSPECTION_STATUS_LABELS,
  type MoveInInspection,
} from "@/lib/move-in-inspections";

export function InspectionStatusBadge({
  status,
}: {
  status: MoveInInspection["status"];
}) {
  return (
    <Badge
      variant={
        status === "COMPLETED"
          ? "default"
          : status === "CANCELED"
            ? "destructive"
            : "secondary"
      }
    >
      {INSPECTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function InspectionReadinessItem({
  icon: Icon,
  label,
  value,
  complete,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-10 items-center justify-center rounded-full ${complete ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
