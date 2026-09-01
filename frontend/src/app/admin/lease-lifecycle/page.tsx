import { Suspense } from "react";
import { LeaseLifecycleWorkspace } from "./_components/lease-lifecycle-workspace";

export default function LeaseLifecyclePage() {
  return (
    <Suspense fallback={<div className="min-h-72" />}>
      <LeaseLifecycleWorkspace />
    </Suspense>
  );
}
