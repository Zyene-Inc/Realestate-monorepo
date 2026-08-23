import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TenantAutoPay() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8 sm:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
          Manual payment policy
        </h1>
        <p className="mt-2 text-muted-foreground">
          Automatic rent payments are intentionally unavailable.
        </p>
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-5 p-7">
          <ShieldCheck className="size-8 text-primary" />
          <p className="leading-7 text-muted-foreground">
            Coach Johnson Realty does not store a payment method for automatic
            rent debits and will never charge you without your action. Each
            month, return to the tenant portal and start a one-time checkout
            only when you want to pay.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/tenant/pay-rent" />}
          >
            Go to pay rent
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
