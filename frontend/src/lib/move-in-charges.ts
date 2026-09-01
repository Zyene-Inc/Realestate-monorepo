export type MoveInChargeCategory =
  | "FIRST_MONTH_RENT"
  | "SECURITY_DEPOSIT"
  | "PET_FEE"
  | "UTILITY"
  | "MOVE_IN_FEE"
  | "OTHER";

export type MoveInCharge = {
  id: string;
  leaseId: string;
  category: MoveInChargeCategory;
  label: string;
  description?: string | null;
  amount: number;
  paidAmount: number;
  refundedAmount: number;
  waivedAmount: number;
  balanceDue: number;
  payoutTreatment:
    | "OWNER_NET_OF_COMMISSION"
    | "OWNER_FULL"
    | "JOHNSON_REALTY";
  status: "OPEN" | "PARTIAL" | "PAID" | "WAIVED" | "VOID";
  dueDate: string;
  tenant: { id: string; firstName: string; lastName: string; email: string };
  lease: {
    id: string;
    monthlyRent: number;
    securityDeposit: number;
    status: string;
  };
  unit: {
    id: string;
    unitNumber: string;
    property: { id: string; name: string };
  };
};

export type MoveInLease = {
  id: string;
  status: string;
  startDate: string;
  monthlyRent: number;
  securityDeposit: number;
  tenant: { id: string; firstName: string; lastName: string };
  unit: { id: string; unitNumber: string; property: { name: string } };
};

export const MOVE_IN_CATEGORY_LABELS: Record<MoveInChargeCategory, string> = {
  FIRST_MONTH_RENT: "First month rent",
  SECURITY_DEPOSIT: "Security deposit",
  PET_FEE: "Pet fee",
  UTILITY: "Utility charge",
  MOVE_IN_FEE: "Move-in fee",
  OTHER: "Other move-in charge",
};

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
