export type RentalProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description: string | null;
  rentAmount: string | number | null;
  applicationFeeAmount: string | number;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  availabilityDate: string | null;
  amenities: string[];
  utilityInfo: string | null;
  photos: string[];
  status: "active" | "rented" | "inactive";
  publishStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  units: Array<{ id: string; status: string }>;
};

export type RentalPropertyForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description: string;
  rentAmount: string;
  applicationFeeAmount: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  availabilityDate: string;
  amenities: string;
  utilityInfo: string;
  status: RentalProperty["status"];
};

export const emptyRentalPropertyForm: RentalPropertyForm = {
  name: "",
  address: "",
  city: "",
  state: "MO",
  zip: "",
  propertyType: "Single Family",
  description: "",
  rentAmount: "",
  applicationFeeAmount: "0",
  bedrooms: "",
  bathrooms: "",
  squareFeet: "",
  availabilityDate: "",
  amenities: "",
  utilityInfo: "",
  status: "active",
};

export function rentalPropertyFormFor(
  property?: RentalProperty,
): RentalPropertyForm {
  if (!property) return { ...emptyRentalPropertyForm };
  return {
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zip,
    propertyType: property.propertyType,
    description: property.description ?? "",
    rentAmount: property.rentAmount == null ? "" : String(property.rentAmount),
    applicationFeeAmount: String(property.applicationFeeAmount ?? 0),
    bedrooms: property.bedrooms == null ? "" : String(property.bedrooms),
    bathrooms: property.bathrooms == null ? "" : String(property.bathrooms),
    squareFeet: property.squareFeet == null ? "" : String(property.squareFeet),
    availabilityDate: property.availabilityDate?.slice(0, 10) ?? "",
    amenities: property.amenities.join(", "),
    utilityInfo: property.utilityInfo ?? "",
    status: property.status,
  };
}
