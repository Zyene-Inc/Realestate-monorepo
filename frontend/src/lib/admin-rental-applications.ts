import { api } from "@/lib/api";
import type {
  RentalApplication,
  RentalApplicationDocument,
  RentalApplicationStatus,
} from "@/lib/rental-applications";

export type RentalApplicationListItem = Pick<
  RentalApplication,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "status"
  | "feeStatus"
  | "feeAmount"
  | "submittedAt"
  | "updatedAt"
> & {
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
  assignedTo: { id: string; email: string } | null;
  _count: { documents: number; notes: number };
};

export type AdminRentalApplication = Omit<RentalApplication, "documents"> & {
  assignedToUserId: string | null;
  assignedTo: { id: string; email: string; role: string } | null;
  reviewedAt: string | null;
  decidedAt: string | null;
  websiteLead: { id: string; status: string; createdAt: string } | null;
  documents: Array<
    RentalApplicationDocument & {
      reviewedBy: { id: string; email: string } | null;
      reviewedAt: string | null;
    }
  >;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; email: string };
  }>;
  handoff: RentalApplicationHandoff | null;
};

type RentalApplicationHandoffStatus =
  | "STARTED"
  | "TENANT_INVITED"
  | "LEASE_CREATED"
  | "ENVELOPE_CREATING"
  | "ENVELOPE_SENT"
  | "SIGNED"
  | "ACTION_REQUIRED"
  | "FAILED";

type RentalApplicationHandoff = {
  id: string;
  status: RentalApplicationHandoffStatus;
  attemptCount: number;
  failureStage: string | null;
  failureReason: string | null;
  tenantInvitedAt: string | null;
  leaseCreatedAt: string | null;
  envelopeSentAt: string | null;
  signedAt: string | null;
  tenant: {
    id: string;
    unitId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  } | null;
  lease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    rentDueDay: number;
    gracePeriodDays: number;
    lateFeeAmount: number;
    unit: {
      id: string;
      unitNumber: string;
      property: { id: string; name: string };
    };
  } | null;
  envelope: {
    id: string;
    providerEnvelopeId: string | null;
    status: string;
    recipientStatus: string | null;
    sentAt: string | null;
    openedAt: string | null;
    completedAt: string | null;
    expiresAt: string | null;
    failureReason: string | null;
  } | null;
};

export type RentalApplicationHandoffOptions = {
  configuration: {
    provider: "VERDOCS";
    plan: "FREE_25_ENVELOPES_MONTHLY";
    enabled: boolean;
    apiConfigured: boolean;
    webhookConfigured: boolean;
    templatesConfigured: boolean;
  };
  template: {
    id: string;
    name: string;
    isSendable: boolean;
    roles: Array<{ name: string; type: string }>;
    missingFieldsByRole: Record<string, string[]>;
  } | null;
  requiredTemplateFields: string[];
  units: Array<{
    id: string;
    unitNumber: string;
    rentAmount: number;
    depositAmount: number;
    status: string;
  }>;
  handoff: RentalApplicationHandoff | null;
};

export type RentalApplicationAssignee = {
  id: string;
  email: string;
  role: string;
};

export function listAdminRentalApplications(input?: {
  status?: RentalApplicationStatus;
  search?: string;
  cursor?: string;
}) {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.search) params.set("search", input.search);
  if (input?.cursor) params.set("cursor", input.cursor);
  const query = params.size ? `?${params.toString()}` : "";
  return api.get(`/admin/rental-applications${query}`) as Promise<{
    items: RentalApplicationListItem[];
    nextCursor: string | null;
  }>;
}

export function getAdminRentalApplication(id: string) {
  return api.get(
    `/admin/rental-applications/${id}`,
  ) as Promise<AdminRentalApplication>;
}

export function getRentalApplicationAssignees() {
  return api.get("/admin/rental-applications/assignees") as Promise<
    RentalApplicationAssignee[]
  >;
}

export function updateRentalApplicationWorkflow(
  application: AdminRentalApplication,
  input: {
    status?: RentalApplicationStatus;
    assignedToUserId?: string;
    clearAssignment?: boolean;
    decisionReason?: string;
  },
) {
  return api.patch(`/admin/rental-applications/${application.id}/workflow`, {
    ...input,
    expectedUpdatedAt: application.updatedAt,
  }) as Promise<AdminRentalApplication>;
}

export function reviewRentalApplicationDocument(
  applicationId: string,
  documentId: string,
  input: { status: "ACCEPTED" | "REJECTED"; rejectionReason?: string },
) {
  return api.patch(
    `/admin/rental-applications/${applicationId}/documents/${documentId}/review`,
    input,
  );
}

export function addRentalApplicationNote(applicationId: string, body: string) {
  return api.post(`/admin/rental-applications/${applicationId}/notes`, {
    body,
  });
}

export function getNewRentalApplicationCount() {
  return api.get("/admin/rental-applications/unread-count") as Promise<{
    count: number;
  }>;
}

export function getRentalApplicationHandoffOptions(applicationId: string) {
  return api.get(
    `/admin/rental-applications/${applicationId}/lease-handoff-options`,
  ) as Promise<RentalApplicationHandoffOptions>;
}

export function startRentalApplicationHandoff(
  applicationId: string,
  input: {
    clientRequestId: string;
    unitId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    rentDueDay: number;
    gracePeriodDays: number;
    lateFeeAmount: number;
    templateId: string;
    recipientRoleName: string;
    title: string;
  },
) {
  return api.post(
    `/admin/rental-applications/${applicationId}/lease-handoff`,
    input,
  ) as Promise<RentalApplicationHandoff>;
}
