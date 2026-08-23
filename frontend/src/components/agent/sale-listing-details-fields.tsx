import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ListingFormState = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  description: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  amenities: string;
};

export function SaleListingDetailsFields({
  form,
  disabled,
  onChange,
}: {
  form: ListingFormState;
  disabled: boolean;
  onChange: (field: keyof ListingFormState, value: string) => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Property details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Listing title">
          <Input
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            required
            disabled={disabled}
          />
        </Field>
        <Field label="Property type">
          <select
            value={form.propertyType}
            onChange={(event) => onChange("propertyType", event.target.value)}
            disabled={disabled}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>Single Family</option>
            <option>Condo</option>
            <option>Townhome</option>
            <option>Multi-Family</option>
            <option>Land</option>
            <option>Commercial</option>
          </select>
        </Field>
        <Field label="Street address" className="md:col-span-2">
          <Input
            value={form.address}
            onChange={(event) => onChange("address", event.target.value)}
            required
            disabled={disabled}
          />
        </Field>
        <Field label="City">
          <Input
            value={form.city}
            onChange={(event) => onChange("city", event.target.value)}
            required
            disabled={disabled}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State">
            <Input
              value={form.state}
              onChange={(event) => onChange("state", event.target.value)}
              required
              disabled={disabled}
            />
          </Field>
          <Field label="ZIP">
            <Input
              value={form.zip}
              onChange={(event) => onChange("zip", event.target.value)}
              required
              disabled={disabled}
            />
          </Field>
        </div>
        <Field label="Sale price">
          <Input
            type="number"
            min="1"
            step="0.01"
            value={form.price}
            onChange={(event) => onChange("price", event.target.value)}
            required
            disabled={disabled}
          />
        </Field>
        <Field label="Square feet">
          <Input
            type="number"
            min="1"
            value={form.squareFeet}
            onChange={(event) => onChange("squareFeet", event.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Bedrooms">
          <Input
            type="number"
            min="0"
            value={form.bedrooms}
            onChange={(event) => onChange("bedrooms", event.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Bathrooms">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={form.bathrooms}
            onChange={(event) => onChange("bathrooms", event.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Amenities (comma separated)" className="md:col-span-2">
          <Input
            value={form.amenities}
            onChange={(event) => onChange("amenities", event.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            rows={7}
            required
            disabled={disabled}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Label className={`grid gap-2 ${className ?? ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </Label>
  );
}
