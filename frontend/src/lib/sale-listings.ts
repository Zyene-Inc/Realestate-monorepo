export type ListingStatus =
  "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type ListingAgent = {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
};

export type SaleListing = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description?: string | null;
  price: string | number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  amenities: string[];
  photos: string[];
  documents?: string[];
  listingStatus?: ListingStatus | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  updatedAt: string;
  agent?: ListingAgent | null;
};

export function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function listingStatusLabel(status?: ListingStatus | null) {
  if (!status) return "Draft";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
