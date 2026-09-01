export const MAINTENANCE_STATUSES = [
  { value: "submitted", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "assigned", label: "Assigned" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "tenant_confirmed", label: "Tenant confirmed" },
] as const;

export type MaintenanceRequest = {
  id: string;
  status: string;
  category: string;
  description: string;
  priority: string;
  preferredAccessTimes: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  cost: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  photoUrls: string[];
  ownerExpenseTotal: string;
  ownerExpenseEntryCount: number;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  unit: { id: string; unitNumber: string };
  property: {
    id: string;
    name: string;
    address: string;
    ownerId: string | null;
  };
  vendor: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    specialty: string | null;
  } | null;
};

export type Vendor = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
};

type OwnerExpenseEntry = {
  id: string;
  entryType: "CHARGE" | "ADJUSTMENT";
  amount: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  propertyOwner: {
    id: string;
    ownerName: string | null;
    companyName: string | null;
  };
  property: { id: string; name: string; address: string };
  unit: { id: string; unitNumber: string } | null;
  vendor: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
  maintenanceRequest: { id: string; category: string; status: string };
  postedBy: { id: string; email: string } | null;
};

export type OwnerExpensePage = {
  summary: { total: string; entryCount: number };
  items: OwnerExpenseEntry[];
  nextCursor: string | null;
};

export function maintenanceStatusLabel(status: string) {
  return (
    MAINTENANCE_STATUSES.find((option) => option.value === status)?.label ??
    status.replaceAll("_", " ")
  );
}
