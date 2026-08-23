import { api } from "@/lib/api";

export type WebsiteLeadStatus = "NEW" | "CONTACTED" | "CLOSED";

export type WebsiteLeadSummary = {
  id: string;
  email: string;
  phone: string | null;
  message: string;
  source: "CHATBOT";
  status: WebsiteLeadStatus;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteLeadDetail = WebsiteLeadSummary & {
  conversation: {
    id: string;
    createdAt: string;
    lastMessageAt: string;
    messages: Array<{
      role: "USER" | "ASSISTANT";
      content: string;
      createdAt: string;
    }>;
  } | null;
};

export type CursorPage<T> = {
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

export function phoneSnippet(phone: string | null) {
  if (!phone) return "No phone";
  return phone.length > 16 ? `${phone.slice(0, 16)}…` : phone;
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

export async function updateWebsiteLeadStatus(
  id: string,
  status: WebsiteLeadStatus,
) {
  return api.patch(`/admin/website-leads/${id}`, { status }) as Promise<
    WebsiteLeadSummary
  >;
}

export async function deleteWebsiteLead(id: string) {
  return api.delete(`/admin/website-leads/${id}`) as Promise<{ id: string }>;
}
