export type ESignatureStatus =
  | "CREATING"
  | "PENDING"
  | "IN_PROGRESS"
  | "FINALIZING"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELED"
  | "EXPIRED"
  | "FAILED";

type ESignatureDocument = {
  id: string;
  documentType: "SIGNED_DOCUMENT" | "CERTIFICATE";
  name: string;
  size: number;
  sha256: string;
  archivedAt: string;
};

export type ESignatureEnvelope = {
  id: string;
  title: string;
  documentType: "LEASE" | "DISCLOSURE" | "AGREEMENT";
  targetType: "TENANT" | "AGENT";
  status: ESignatureStatus;
  recipientStatus: string | null;
  recipientEmail: string;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  tenant?: { id: string; firstName: string; lastName: string } | null;
  agent?: { id: string; companyName: string; contactName: string } | null;
  lease?: {
    id: string;
    unit: { unitNumber: string; property: { id: string; name: string } };
  } | null;
  documents: ESignatureDocument[];
};

export type ESignatureEvent = {
  id: string;
  source: "LOCAL" | "VERDOCS";
  eventType: string;
  actor: string | null;
  occurredAt: string;
};

export type CursorPage<T> = { items: T[]; nextCursor: string | null };

export const terminalSignatureStatuses: ESignatureStatus[] = [
  "COMPLETED",
  "DECLINED",
  "CANCELED",
  "EXPIRED",
  "FAILED",
];

export function signatureStatusLabel(status: ESignatureStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}

export function documentTypeLabel(type: ESignatureEnvelope["documentType"]) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
