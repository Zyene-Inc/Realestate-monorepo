import { CommissionCorrectionDialog } from "./commission-correction-dialog";
import { CommissionDetailsDialog } from "./commission-details-dialog";
import type {
  CommissionDialogsProps,
  CommissionEntryForm,
} from "./commission-dialog-types";
import { CommissionEntryDialog } from "./commission-entry-dialog";
import { CommissionVoidDialog } from "./commission-void-dialog";

export type { CommissionEntryForm };

export function CommissionDialogs({
  create,
  details,
  correction,
  voiding,
  saving,
}: CommissionDialogsProps) {
  return (
    <>
      <CommissionEntryDialog model={create} saving={saving} />
      <CommissionDetailsDialog model={details} />
      <CommissionCorrectionDialog model={correction} saving={saving} />
      <CommissionVoidDialog model={voiding} saving={saving} />
    </>
  );
}
