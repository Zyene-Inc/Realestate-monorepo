import { api } from "@/lib/api";

export type WebsiteLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "SCREENING"
  | "TOUR_SCHEDULED"
  | "CLOSED";
export type WebsiteLeadScreeningStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "QUALIFIED"
  | "NOT_QUALIFIED";
export type WebsiteLeadTourStatus =
  | "NOT_SCHEDULED"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";
export type WebsiteLeadSource = "CHATBOT" | "CONTACT_FORM";
export type WebsiteLeadIntent =
  | "GENERAL"
  | "RENTAL_INQUIRY"
  | "RENTAL_TOUR"
  | "RENTAL_APPLICATION"
  | "SIMILAR_RENTAL"
  | "BUYER_INQUIRY"
  | "SELLER_INQUIRY"
  | "MARKET_REPORT";

export type WebsiteLeadSummary = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  message: string;
  source: WebsiteLeadSource;
  intent: WebsiteLeadIntent | null;
  status: WebsiteLeadStatus;
  propertyId: string | null;
  unitId: string | null;
  moveInDate: string | null;
  assignedToUserId: string | null;
  assignedAt: string | null;
  assignedTo: WebsiteLeadAssignee | null;
  contactedAt: string | null;
  closedAt: string | null;
  screeningStatus: WebsiteLeadScreeningStatus;
  screeningSummary: string | null;
  screeningCompletedAt: string | null;
  tourStatus: WebsiteLeadTourStatus;
  tourScheduledAt: string | null;
  tourCompletedAt: string | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    name: string;
    address: string;
  } | null;
  unit: {
    id: string;
    unitNumber: string;
  } | null;
};

export type WebsiteLeadDetail = WebsiteLeadSummary & {
  _count: { notes: number };
  conversation: {
    id: string;
    createdAt: string;
    lastMessageAt: string;
    messages: Array<{
      id: string;
      role: "USER" | "ASSISTANT";
      content: string;
      createdAt: string;
    }>;
  } | null;
};

export type WebsiteLeadAssignee = {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "SALES_ADMIN" | "TENANT_ADMIN";
};

export type WebsiteLeadNote = {
  id: string;
  leadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: WebsiteLeadAssignee;
};

const moveInDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export function leadTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function websiteLeadIntentLabel(intent: WebsiteLeadIntent | null) {
  const labels: Record<WebsiteLeadIntent, string> = {
    GENERAL: "General contact",
    RENTAL_INQUIRY: "Rental inquiry",
    RENTAL_TOUR: "Tour request",
    RENTAL_APPLICATION: "Application request",
    SIMILAR_RENTAL: "Similar rental request",
    BUYER_INQUIRY: "Buyer inquiry",
    SELLER_INQUIRY: "Seller inquiry",
    MARKET_REPORT: "Market report request",
  };
  return intent ? labels[intent] : "Chatbot handoff";
}

export function websiteLeadSourceLabel(source: WebsiteLeadSource) {
  return source === "CONTACT_FORM" ? "Contact form" : "Property assistant";
}

export function websiteLeadStatusLabel(status: WebsiteLeadStatus) {
  const labels: Record<WebsiteLeadStatus, string> = {
    NEW: "New inquiry",
    CONTACTED: "Contacted",
    SCREENING: "Screening",
    TOUR_SCHEDULED: "Tour scheduled",
    CLOSED: "Closed",
  };
  return labels[status];
}

export function screeningStatusLabel(status: WebsiteLeadScreeningStatus) {
  const labels: Record<WebsiteLeadScreeningStatus, string> = {
    NOT_STARTED: "Not started",
    IN_PROGRESS: "In progress",
    QUALIFIED: "Qualified",
    NOT_QUALIFIED: "Not qualified",
  };
  return labels[status];
}

export function tourStatusLabel(status: WebsiteLeadTourStatus) {
  const labels: Record<WebsiteLeadTourStatus, string> = {
    NOT_SCHEDULED: "Not scheduled",
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    CANCELED: "Canceled",
    NO_SHOW: "No show",
  };
  return labels[status];
}

export function moveInDateLabel(value: string | null) {
  if (!value) return null;
  return moveInDateFormatter.format(new Date(value));
}

export async function listWebsiteLeads(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return api.get(`/admin/website-leads${query}`) as Promise<
    CursorPage<WebsiteLeadSummary>
  >;
}

export async function getNewWebsiteLeadCount() {
  return api.get("/admin/website-leads/unread-count") as Promise<{
    count: number;
  }>;
}

export async function getWebsiteLead(id: string) {
  return api.get(`/admin/website-leads/${id}`) as Promise<WebsiteLeadDetail>;
}

export type UpdateWebsiteLeadWorkflowInput = {
  status?: WebsiteLeadStatus;
  assignedToUserId?: string | null;
  screeningStatus?: WebsiteLeadScreeningStatus;
  screeningSummary?: string | null;
  tourStatus?: WebsiteLeadTourStatus;
  tourScheduledAt?: string | null;
  expectedUpdatedAt: string;
};

export async function updateWebsiteLeadWorkflow(
  id: string,
  input: UpdateWebsiteLeadWorkflowInput,
) {
  return api.patch(
    `/admin/website-leads/${id}`,
    input,
  ) as Promise<WebsiteLeadDetail>;
}

export async function listWebsiteLeadAssignees(id: string) {
  return api.get(
    `/admin/website-leads/${id}/assignees`,
  ) as Promise<WebsiteLeadAssignee[]>;
}

export async function listWebsiteLeadNotes(id: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return api.get(
    `/admin/website-leads/${id}/notes${query}`,
  ) as Promise<CursorPage<WebsiteLeadNote>>;
}

export async function createWebsiteLeadNote(id: string, body: string) {
  return api.post(`/admin/website-leads/${id}/notes`, {
    body,
  }) as Promise<WebsiteLeadNote>;
}

export async function deleteWebsiteLead(id: string) {
  return api.delete(`/admin/website-leads/${id}`) as Promise<{ id: string }>;
}

export type SubmitWebsiteContactLeadInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  intent: WebsiteLeadIntent;
  propertyId?: string;
  unitId?: string;
  moveInDate?: string;
  website?: string;
};

export async function submitWebsiteContactLead(
  input: SubmitWebsiteContactLeadInput,
) {
  return api.post("/public/website-leads/contact", input) as Promise<{
    id: string;
    status: WebsiteLeadStatus;
  }>;
}
