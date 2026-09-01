import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LeaseLifecycleLink({ leaseId }: { leaseId: string }) {
  return (
    <Button
      nativeButton={false}
      variant="outline"
      render={<Link href={`/admin/lease-lifecycle?lease=${leaseId}`} />}
    >
      Renew / move out
    </Button>
  );
}
