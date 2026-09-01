import { api } from "@/lib/api";

export type RentalApplicationStatus =
  | "DRAFT"
  | "FEE_PENDING"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_INFORMATION"
  | "APPROVED"
  | "DENIED"
  | "WITHDRAWN";

export type RentalApplicationDocument = {
  id: string;
  type: "GOVERNMENT_ID" | "INCOME_PROOF" | "OTHER";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RentalApplication = {
  id: string;
  propertyId: string;
  unitId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  moveInDate: string;
  householdSize: number;
  occupantsDescription: string | null;
  petsDescription: string | null;
  employmentStatus: string;
  employerName: string | null;
  monthlyGrossIncome: string | number;
  additionalIncome: string | number;
  rentalHistory: string | null;
  priorLandlordName: string | null;
  priorLandlordEmail: string | null;
  priorLandlordPhone: string | null;
  status: RentalApplicationStatus;
  feeStatus:
    | "NOT_REQUIRED"
    | "PENDING"
    | "OPEN"
    | "PAID"
    | "FAILED"
    | "EXPIRED"
    | "REFUNDED"
    | "DISPUTED";
  feeAmount: string | number;
  decisionReason: string | null;
  submittedAt: string | null;
  updatedAt: string;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    photos: string[];
  };
  unit: {
    id: string;
    unitNumber: string;
    rentAmount: number;
    depositAmount: number;
  } | null;
  documents: RentalApplicationDocument[];
};

export type RentalApplicationForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  moveInDate: string;
  householdSize: string;
  occupantsDescription: string;
  petsDescription: string;
  employmentStatus: string;
  employerName: string;
  monthlyGrossIncome: string;
  additionalIncome: string;
  rentalHistory: string;
  priorLandlordName: string;
  priorLandlordEmail: string;
  priorLandlordPhone: string;
};

export const emptyRentalApplicationForm: RentalApplicationForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  currentAddress: "",
  currentCity: "",
  currentState: "MO",
  currentZip: "",
  moveInDate: "",
  householdSize: "1",
  occupantsDescription: "",
  petsDescription: "",
  employmentStatus: "Full-time employment",
  employerName: "",
  monthlyGrossIncome: "",
  additionalIncome: "",
  rentalHistory: "",
  priorLandlordName: "",
  priorLandlordEmail: "",
  priorLandlordPhone: "",
};

export function createRentalApplication(
  propertyId: string,
  unitId: string | undefined,
  form: RentalApplicationForm,
) {
  return api.post("/public/rental-applications", {
    ...form,
    propertyId,
    unitId,
    householdSize: Number(form.householdSize),
    monthlyGrossIncome: Number(form.monthlyGrossIncome),
    additionalIncome: Number(form.additionalIncome || 0),
    employerName: form.employerName || undefined,
    occupantsDescription: form.occupantsDescription || undefined,
    petsDescription: form.petsDescription || undefined,
    rentalHistory: form.rentalHistory || undefined,
    priorLandlordName: form.priorLandlordName || undefined,
    priorLandlordEmail: form.priorLandlordEmail || undefined,
    priorLandlordPhone: form.priorLandlordPhone || undefined,
  }) as Promise<{ application: RentalApplication }>;
}

export function rentalApplicationFormFor(
  application: RentalApplication,
): RentalApplicationForm {
  return {
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: application.phone,
    dateOfBirth: application.dateOfBirth.slice(0, 10),
    currentAddress: application.currentAddress,
    currentCity: application.currentCity,
    currentState: application.currentState,
    currentZip: application.currentZip,
    moveInDate: application.moveInDate.slice(0, 10),
    householdSize: String(application.householdSize),
    occupantsDescription: application.occupantsDescription ?? "",
    petsDescription: application.petsDescription ?? "",
    employmentStatus: application.employmentStatus,
    employerName: application.employerName ?? "",
    monthlyGrossIncome: String(application.monthlyGrossIncome),
    additionalIncome: String(application.additionalIncome),
    rentalHistory: application.rentalHistory ?? "",
    priorLandlordName: application.priorLandlordName ?? "",
    priorLandlordEmail: application.priorLandlordEmail ?? "",
    priorLandlordPhone: application.priorLandlordPhone ?? "",
  };
}

export function updateRentalApplication(
  application: RentalApplication,
  form: RentalApplicationForm,
) {
  return api.patch(`/public/rental-applications/${application.id}`, {
    ...form,
    householdSize: Number(form.householdSize),
    monthlyGrossIncome: Number(form.monthlyGrossIncome),
    additionalIncome: Number(form.additionalIncome || 0),
    employerName: form.employerName || undefined,
    occupantsDescription: form.occupantsDescription || undefined,
    petsDescription: form.petsDescription || undefined,
    rentalHistory: form.rentalHistory || undefined,
    priorLandlordName: form.priorLandlordName || undefined,
    priorLandlordEmail: form.priorLandlordEmail || undefined,
    priorLandlordPhone: form.priorLandlordPhone || undefined,
    expectedUpdatedAt: application.updatedAt,
  }) as Promise<RentalApplication>;
}

export function getRentalApplication(id: string) {
  return api.get(`/public/rental-applications/${id}`) as Promise<RentalApplication>;
}

export function submitRentalApplication(
  application: RentalApplication,
  certified: boolean,
) {
  return api.post(`/public/rental-applications/${application.id}/submit`, {
    certified,
    expectedUpdatedAt: application.updatedAt,
  }) as Promise<{ application: RentalApplication }>;
}

export function createApplicationFeeCheckout(id: string) {
  return api.post(`/public/rental-applications/${id}/fee-checkout`, {}) as Promise<{
    url?: string;
    paid?: boolean;
  }>;
}

export function exchangeRentalApplicationSession(
  applicationId: string,
  accessToken: string,
) {
  return api.post("/public/rental-applications/session", {
    applicationId,
    accessToken,
  }) as Promise<{ applicationId: string }>;
}

export function formatApplicationStatus(status: RentalApplicationStatus) {
  return status.replaceAll("_", " ").toLowerCase();
}
