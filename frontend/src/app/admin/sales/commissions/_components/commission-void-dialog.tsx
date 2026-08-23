import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommissionDialogsProps } from "./commission-dialog-types";

export function CommissionVoidDialog({
  model,
  saving,
}: {
  model: CommissionDialogsProps["voiding"];
  saving: boolean;
}) {
  const { open, setOpen, reason, setReason, submit } = model;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this commission?</DialogTitle>
          <DialogDescription>
            This removes the amount from revenue totals but preserves the
            original record and complete audit history.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason for void</Label>
            <Textarea
              id="void-reason"
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm void
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
