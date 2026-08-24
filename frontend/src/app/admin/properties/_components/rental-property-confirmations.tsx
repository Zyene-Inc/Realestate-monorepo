import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RentalProperty } from "./rental-property-types";

export function RentalPhotoRemovalDialog({
  photoIndex,
  busy,
  onOpenChange,
  onConfirm,
}: {
  photoIndex: number | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={photoIndex !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this listing photo?</DialogTitle>
          <DialogDescription>
            The image will be removed from this rental and deleted from storage.
            If it is the cover photo, the next photo becomes the cover
            automatically.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            Remove photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RentalPropertyRemovalDialog({
  property,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  property: RentalProperty | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={property !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this rental draft?</DialogTitle>
          <DialogDescription>
            <strong>{property?.name}</strong> will be removed permanently. This
            cannot be undone. Published rentals and rentals with units must be
            unpublished and empty before they can be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void onConfirm()}
          >
            {deleting ? <Loader2 className="animate-spin" /> : null}
            Delete rental
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
