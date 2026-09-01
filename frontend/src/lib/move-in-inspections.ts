export const INSPECTION_CONDITIONS = [
  "NOT_INSPECTED",
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
  "NOT_APPLICABLE",
] as const;

export type InspectionCondition = (typeof INSPECTION_CONDITIONS)[number];
export type MoveInInspectionStatus =
  "DRAFT" | "READY_FOR_TENANT" | "COMPLETED" | "CANCELED";
type InspectionPhotoSource = "STAFF" | "TENANT";
export type InspectionMeterType = "ELECTRIC" | "GAS" | "WATER" | "OTHER";
export type InspectionKeyType =
  "UNIT" | "MAILBOX" | "GARAGE" | "FOB" | "ACCESS_CARD" | "OTHER";

export const CONDITION_LABELS: Record<InspectionCondition, string> = {
  NOT_INSPECTED: "Not inspected",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  DAMAGED: "Damaged",
  NOT_APPLICABLE: "Not applicable",
};

export const INSPECTION_STATUS_LABELS: Record<MoveInInspectionStatus, string> =
  {
    DRAFT: "Draft",
    READY_FOR_TENANT: "Awaiting resident",
    COMPLETED: "Completed",
    CANCELED: "Canceled",
  };

const INSPECTION_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});
const INSPECTION_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

type InspectionPhoto = {
  id: string;
  itemId: string | null;
  meterReadingId: string | null;
  source: InspectionPhotoSource;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedByUserId: string;
  createdAt: string;
};

export type InspectionItem = {
  id: string;
  name: string;
  condition: InspectionCondition;
  staffNotes: string | null;
  tenantCondition: InspectionCondition | null;
  tenantNotes: string | null;
  tenantObservedAt: string | null;
  sortOrder: number;
};

export type InspectionArea = {
  id: string;
  name: string;
  sortOrder: number;
  items: InspectionItem[];
};

type InspectionMeter = {
  id: string;
  type: InspectionMeterType;
  label: string;
  reading: number;
  unit: string;
  readAt: string;
  notes: string | null;
  sortOrder: number;
};

export type InspectionKey = {
  id: string;
  type: InspectionKeyType;
  label: string;
  quantity: number;
  identifier: string | null;
  notes: string | null;
  handedOverAt: string | null;
  sortOrder: number;
};

type InspectionAcknowledgement = {
  id: string;
  typedName: string;
  statementText: string;
  inspectionRevision: number;
  tenantNotes: string | null;
  recordSha256: string;
  acknowledgedAt: string;
};

export type MoveInInspection = {
  id: string;
  leaseId: string;
  tenantId: string;
  unitId: string;
  status: MoveInInspectionStatus;
  scheduledAt: string | null;
  staffNotes: string | null;
  noPhysicalKeys: boolean;
  accessMethodNotes: string | null;
  revision: number;
  checklistVersion: number;
  readyForTenantAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  updatedAt: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    userId: string | null;
  };
  lease: { id: string; startDate: string; endDate: string; status: string };
  unit: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
      address: string;
      city: string;
      state: string;
    };
  };
  areas: InspectionArea[];
  meterReadings: InspectionMeter[];
  keys: InspectionKey[];
  photos: InspectionPhoto[];
  acknowledgement: InspectionAcknowledgement | null;
  acknowledgementStatement: string;
  readiness: {
    itemCount: number;
    uninspected: number;
    keysComplete: boolean;
    ready: boolean;
  };
};

export type InspectionSummary = {
  id: string;
  leaseId: string;
  status: MoveInInspectionStatus;
  scheduledAt: string | null;
  revision: number;
  readyForTenantAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  tenant: { firstName: string; lastName: string };
  lease: { startDate: string; status: string };
  unit: {
    unitNumber: string;
    property: { name: string; address: string };
  };
  _count: { photos: number; meterReadings: number; keys: number };
};

export function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function inspectionProgress(inspection: MoveInInspection) {
  const complete =
    inspection.readiness.itemCount - inspection.readiness.uninspected;
  return inspection.readiness.itemCount
    ? Math.round((complete / inspection.readiness.itemCount) * 100)
    : 0;
}

export function formatInspectionDateTime(value: string) {
  return INSPECTION_DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatInspectionNumber(value: number) {
  return INSPECTION_NUMBER_FORMATTER.format(value);
}
