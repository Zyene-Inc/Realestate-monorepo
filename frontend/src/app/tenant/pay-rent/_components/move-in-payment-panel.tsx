"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  MOVE_IN_CATEGORY_LABELS,
  type MoveInCharge,
  money,
} from "@/lib/move-in-charges";
import { toast } from "sonner";

type CheckoutResponse = { url: string };

const moveInDueDate = new Intl.DateTimeFormat("en-US");

function isPayable(charge: MoveInCharge) {
  return ["OPEN", "PARTIAL"].includes(charge.status) && charge.balanceDue > 0;
}

export function MoveInPaymentPanel() {
  const [charges, setCharges] = useState<MoveInCharge[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api
      .get("/payments/move-in/my")
      .then((rows: MoveInCharge[]) => {
        setCharges(rows);
        setSelected(
          rows.reduce<string[]>((ids, charge) => {
            if (isPayable(charge)) ids.push(charge.id);
            return ids;
          }, []),
        );
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load move-in charges")),
      )
      .finally(() => setLoading(false));
  }, []);

  const open = useMemo(
    () => charges.filter(isPayable),
    [charges],
  );
  const payableIds = useMemo(
    () => new Set(open.map((charge) => charge.id)),
    [open],
  );
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const selectedCharges = useMemo(
    () => open.filter((charge) => selectedIds.has(charge.id)),
    [open, selectedIds],
  );
  const total = selectedCharges.reduce(
    (sum, charge) => sum + charge.balanceDue,
    0,
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function checkout() {
    if (!selected.length) return;
    setStarting(true);
    try {
      const response = (await api.post("/payments/move-in/my/checkout", {
        clientRequestId: crypto.randomUUID(),
        chargeIds: selected,
      })) as CheckoutResponse;
      window.location.assign(response.url);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to start move-in payment checkout"),
      );
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <Card><CardContent className="flex h-28 items-center justify-center"><Loader2 className="animate-spin text-primary" /></CardContent></Card>
    );
  }
  if (!charges.length) return null;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b border-border bg-primary/5">
        <CardTitle className="flex items-center gap-3 text-lg">
          <PackageCheck className="text-primary" /> Move-in charges
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review every one-time charge. Select one or several and actively start
          a secure payment—nothing is debited automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="divide-y divide-border rounded-xl border border-border">
          {charges.map((charge) => {
            const payable = payableIds.has(charge.id);
            return (
              <label
                key={charge.id}
                className="flex min-h-16 items-center gap-4 px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                {payable ? (
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selectedIds.has(charge.id)}
                    onChange={() => toggle(charge.id)}
                    aria-label={`Select ${charge.label}`}
                  />
                ) : (
                  <span className="size-4" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{charge.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {MOVE_IN_CATEGORY_LABELS[charge.category]} · Due{" "}
                    {moveInDueDate.format(new Date(charge.dueDate))}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">
                    {money.format(charge.balanceDue)}
                  </span>
                  <Badge variant={charge.status === "PAID" ? "default" : "secondary"}>{charge.status}</Badge>
                </span>
              </label>
            );
          })}
        </div>
        {open.length ? (
          <div className="flex flex-col gap-4 rounded-xl bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected balance</p>
              <p className="text-2xl font-semibold tabular-nums">{money.format(total)}</p>
            </div>
            <Button disabled={!selected.length || starting} onClick={checkout}>
              {starting ? <Loader2 className="animate-spin" /> : <CreditCard />}
              Pay selected charges
            </Button>
          </div>
        ) : (
          <p className="text-sm font-medium text-primary">
            All posted move-in charges are resolved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
