"use client";

import { Compass, MoveLeft, MoveRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProductTourStep = {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
};

type ProductTourProps = {
  portalName: string;
  steps: ProductTourStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
};

export function useProductTour(storageKey: string) {
  const [open, setOpen] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(storageKey) !== "complete") {
          setOpen(true);
        }
      } catch {
        // The tour remains available from navigation when storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const close = () => {
    try {
      window.localStorage.setItem(storageKey, "complete");
    } catch {
      // Closing must never be blocked by a browser storage preference.
    }
    setOpen(false);
  };

  const restart = () => {
    setRunId((current) => current + 1);
    setOpen(true);
  };

  return { close, open, restart, runId, setOpen };
}

export function ProductTour({
  portalName,
  steps,
  open,
  onOpenChange,
  onComplete,
}: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const router = useRouter();
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  if (!step) return null;

  const finish = () => onComplete();

  const openDestination = () => {
    if (!step.action) return;
    finish();
    router.push(step.action.href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : finish())}
    >
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <div className="bg-sidebar px-6 py-6 text-sidebar-foreground">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/65">
              {stepIndex + 1} of {steps.length}
            </p>
          </div>
          <DialogHeader className="mt-5 gap-2">
            <DialogTitle className="text-xl font-semibold text-sidebar-foreground">
              Welcome to {portalName}
            </DialogTitle>
            <DialogDescription className="text-sidebar-foreground/70">
              A short guide to the tasks you will use most.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {stepIndex === 0 ? "Start here" : "Next workspace"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-foreground">
            {step.title}
          </h2>
          <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
            {step.description}
          </p>
          {step.action ? (
            <Button className="mt-5" type="button" onClick={openDestination}>
              {step.action.label}
            </Button>
          ) : null}
        </div>

        <DialogFooter className="-mx-0 -mb-0 px-6 py-4">
          <Button type="button" variant="ghost" onClick={finish}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex((current) => current - 1)}
              >
                <MoveLeft aria-hidden="true" />
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={
                isLastStep
                  ? finish
                  : () => setStepIndex((current) => current + 1)
              }
            >
              {isLastStep ? "Finish tour" : "Next"}
              {!isLastStep ? <MoveRight aria-hidden="true" /> : null}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
