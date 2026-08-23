import type { Dispatch, FormEvent, SetStateAction } from "react";
import type {
  CommissionPaymentMethod,
  EligibleSaleListing,
  SaleCommission,
} from "@/lib/sale-commissions";

export const commissionInputClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";

export const commissionPaymentMethods: CommissionPaymentMethod[] = [
  "ACH",
  "CASH",
  "CHECK",
  "WIRE",
  "OTHER",
];

export type CommissionEntryForm = {
  propertyId: string;
  salePrice: string;
  commissionAmount: string;
  receivedAt: string;
  paymentMethod: CommissionPaymentMethod;
  referenceNumber: string;
  notes: string;
};

export type CommissionDialogsProps = {
  create: {
    open: boolean;
    setOpen: (open: boolean) => void;
    entry: CommissionEntryForm;
    setEntry: Dispatch<SetStateAction<CommissionEntryForm>>;
    eligible: EligibleSaleListing[];
    eligibleCursor: string | null;
    selectedListing?: EligibleSaleListing;
    loadMoreListings: () => Promise<void>;
    submit: (event: FormEvent) => Promise<void>;
  };
  details: {
    open: boolean;
    setOpen: (open: boolean) => void;
    selected: SaleCommission | null;
    beginCorrection: () => void;
    beginVoid: () => void;
  };
  correction: {
    open: boolean;
    setOpen: (open: boolean) => void;
    form: CommissionEntryForm;
    setForm: Dispatch<SetStateAction<CommissionEntryForm>>;
    reason: string;
    setReason: (reason: string) => void;
    submit: (event: FormEvent) => Promise<void>;
  };
  voiding: {
    open: boolean;
    setOpen: (open: boolean) => void;
    reason: string;
    setReason: (reason: string) => void;
    submit: (event: FormEvent) => Promise<void>;
  };
  saving: boolean;
};
