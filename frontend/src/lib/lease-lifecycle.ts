type RenewalStatus =
  | "DRAFT"
  | "SIGNING"
  | "SIGNED"
  | "DECLINED"
  | "CANCELED"
  | "EXPIRED"
  | "FAILED";

export type InspectionCondition =
  | "NOT_INSPECTED"
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "DAMAGED"
  | "NOT_APPLICABLE";

export type DepositDisposition = {
  id: string;
  status: "DRAFT" | "ITEMIZED" | "ISSUED" | "RETURNED" | "DISPUTED";
  amountHeld: string;
  deductionsTotal: string;
  refundAmount: string;
  dueDate: string;
  forwardingAddress: string;
  returnMethod: string | null;
  returnReference: string | null;
  proofStoragePath: string | null;
  disputeReason: string | null;
  deductions: {
    id: string;
    category: string;
    description: string;
    amount: string;
  }[];
  ledgerEntries: {
    id: string;
    entryType: string;
    amount: string;
    description: string;
    occurredAt: string;
  }[];
};

export type MoveOutInspection = {
  id: string;
  status:
    | "DRAFT"
    | "SCHEDULED"
    | "COMPLETED"
    | "TENANT_ACKNOWLEDGED"
    | "CANCELED";
  scheduledAt: string | null;
  actualMoveOutAt: string | null;
  turnoverStatus: "READY_TO_RENT" | "MAINTENANCE_REQUIRED" | null;
  keysReturned: boolean;
  revision: number;
  staffNotes: string | null;
  tenantNotes: string | null;
  items: {
    id: string;
    area: string;
    name: string;
    condition: InspectionCondition;
    notes: string | null;
    estimatedCost: string;
  }[];
  disposition: DepositDisposition | null;
};

type VacateNotice = {
  id: string;
  source: "TENANT" | "MANAGEMENT" | "MUTUAL";
  status:
    | "SUBMITTED"
    | "ACKNOWLEDGED"
    | "MOVE_OUT_IN_PROGRESS"
    | "COMPLETED"
    | "CANCELED";
  noticeDate: string;
  plannedMoveOutDate: string;
  reason: string | null;
  forwardingAddress: string | null;
  inspection: MoveOutInspection | null;
};

type LeaseRenewal = {
  id: string;
  status: RenewalStatus;
  proposedStartDate: string;
  proposedEndDate: string;
  proposedMonthlyRent: string;
  proposedSecurityDeposit: string;
  proposedRentDueDay: number;
  proposedGracePeriodDays: number;
  proposedLateFeeAmount: string;
  offerExpiresAt: string;
  sentAt: string | null;
  signedAt: string | null;
  activatedAt: string | null;
  envelope: { id: string; status: string; archivedAt: string | null } | null;
};

export type LeaseLifecycle = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  gracePeriodDays: number;
  lateFeeAmount: number;
  tenant: { id: string; firstName: string; lastName: string; email: string };
  unit: {
    id: string;
    unitNumber: string;
    status: string;
    property: { id: string; name: string; address: string };
  };
  renewals: LeaseRenewal[];
  vacateNotices: VacateNotice[];
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function money(value: number | string) {
  return usdFormatter.format(Number(value));
}

export function shortDate(value: string | Date) {
  return shortDateFormatter.format(new Date(value));
}

export function statusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
