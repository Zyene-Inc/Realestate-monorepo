export type ReportOverview = {
  range: { from: string; to: string };
  queues: {
    pendingAgents: number;
    pendingListings: number;
    agents: Array<{
      id: string;
      companyName: string;
      contactName: string;
      email: string;
      createdAt: string;
    }>;
    listings: Array<{
      id: string;
      name: string;
      address: string;
      submittedAt: string | null;
      agent: { companyName: string; contactName: string } | null;
    }>;
  };
  rentals: {
    properties: number;
    publishedProperties: number;
    unassignedProperties: number;
    units: number;
    occupiedUnits: number;
    vacantUnits: number;
    maintenanceUnits: number;
    offMarketUnits: number;
    occupancyRate: number;
  };
  rentRevenue: {
    collected: string;
    managementCommission: string;
    ownerProceeds: string;
    paymentCount: number;
    unassignedCollected: string;
    unassignedPaymentCount: number;
    maintenanceExpenses: string;
    maintenanceExpenseEntryCount: number;
  };
  saleRevenue: { commission: string; receiptCount: number };
  companyRevenue: { combined: string };
  compliance: {
    auditEventCount: number;
    actorCount: number;
    systemEventCount: number;
  };
};

export type OwnerReportRow = {
  id: string;
  ownerName: string | null;
  companyName: string | null;
  contactEmail: string;
  payoutStatus: string;
  commissionRate: string;
  createdAt: string;
  propertyCount: number;
  publishedPropertyCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  rentCollected: string;
  managementCommission: string;
  ownerProceeds: string;
  paymentCount: number;
  moveInCollected: string;
  moveInOwnerProceeds: string;
  moveInPaymentCount: number;
  maintenanceExpenses: string;
  maintenanceExpenseEntryCount: number;
  netOwnerPosition: string;
};

export type OwnerReportPage = {
  range: { from: string; to: string };
  items: OwnerReportRow[];
  nextCursor: string | null;
};

export type AuditEvent = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; role: string } | null;
};

export type AuditEventPage = {
  items: AuditEvent[];
  nextCursor: string | null;
};
