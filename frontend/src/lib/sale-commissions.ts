export type CommissionPaymentMethod =
  "ACH" | "CASH" | "CHECK" | "WIRE" | "OTHER";

export type SaleCommissionStatus = "ACTIVE" | "VOIDED";

type CommissionProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: string | null;
  status: string;
};

type CommissionAgent = {
  id: string;
  companyName: string;
  contactName: string;
  email?: string;
};

type SaleCommissionEvent = {
  id: string;
  type: "CREATED" | "CORRECTED" | "VOIDED";
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
  actor: { id: string; email: string };
};

export type SaleCommission = {
  id: string;
  propertyId: string;
  agentId: string;
  salePrice: string | null;
  commissionAmount: string;
  currency: "USD";
  receivedAt: string;
  paymentMethod: CommissionPaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  status: SaleCommissionStatus;
  recordedBy: { id: string; email: string };
  voidedAt: string | null;
  voidReason: string | null;
  voidedBy: { id: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  property: CommissionProperty;
  agent: CommissionAgent;
  events?: SaleCommissionEvent[];
};

export type EligibleSaleListing = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: string | null;
  updatedAt: string;
  agent: CommissionAgent;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type SaleCommissionReport = {
  range: { from: string; to: string };
  summary: {
    commissionAmount: string;
    salePrice: string;
    averageCommission: string;
    recordCount: number;
    voidedCount: number;
    lifetimeCommission: string;
    lifetimeRecordCount: number;
    monthToDate: string;
    yearToDate: string;
  };
  byAgent: Array<{
    agent?: CommissionAgent;
    commissionAmount: string;
    recordCount: number;
  }>;
  byPaymentMethod: Array<{
    paymentMethod: CommissionPaymentMethod;
    commissionAmount: string;
    recordCount: number;
  }>;
  monthly: Array<{
    month: string;
    commissionAmount: string;
    recordCount: number;
  }>;
};

const commissionMoneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const commissionDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/Chicago",
});

export const commissionMoney = (amount: string | number | null) =>
  commissionMoneyFormatter.format(Number(amount ?? 0));

export const commissionDate = (date: string) =>
  commissionDateFormatter.format(new Date(date));
