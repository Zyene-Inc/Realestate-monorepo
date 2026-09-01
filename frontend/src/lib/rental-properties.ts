type RentalUnit = {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentAmount: number;
  depositAmount: number;
  availableDate?: string | null;
};

export type RentalProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description?: string | null;
  rentAmount?: string | number | null;
  applicationFeeAmount: string | number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  availabilityDate?: string | null;
  amenities: string[];
  utilityInfo?: string | null;
  photos: string[];
  status: string;
  publishedAt?: string | null;
  updatedAt: string;
  units: RentalUnit[];
};

export function rentalPrice(property: RentalProperty) {
  if (property.units.length > 0) return property.units[0].rentAmount;
  if (property.rentAmount != null) return Number(property.rentAmount);
  return null;
}
