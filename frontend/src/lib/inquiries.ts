export type InquiryMessage = {
  id: string;
  senderType: "BUYER" | "AGENT";
  body: string;
  readAt?: string | null;
  createdAt: string;
};

export type ListingInquiry = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  status: "OPEN" | "CLOSED";
  lastMessageAt: string;
  agentLastReadAt?: string | null;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
  agent: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone?: string | null;
  };
  messages: InquiryMessage[];
  nextMessageCursor?: string | null;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

const inquiryDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function inquiryTime(value: string) {
  return inquiryDateFormatter.format(new Date(value));
}
