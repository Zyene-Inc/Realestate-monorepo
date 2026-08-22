import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PortalMetric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-[1fr_auto] gap-5 p-5 sm:p-6">
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="size-5" strokeWidth={1.7} aria-hidden="true" /></span>
      </CardContent>
    </Card>
  );
}
