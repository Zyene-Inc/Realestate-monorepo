import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RentalApplicationForm } from "@/lib/rental-applications";

const fields = [
  ["firstName", "First name", "text"],
  ["lastName", "Last name", "text"],
  ["email", "Email", "email"],
  ["phone", "Phone", "tel"],
  ["dateOfBirth", "Date of birth", "date"],
  ["moveInDate", "Preferred move-in date", "date"],
  ["currentAddress", "Current street address", "text"],
  ["currentCity", "City", "text"],
  ["currentState", "State", "text"],
  ["currentZip", "ZIP code", "text"],
  ["householdSize", "Total household members", "number"],
  ["employerName", "Employer or income source", "text"],
  ["monthlyGrossIncome", "Monthly gross income", "number"],
  ["additionalIncome", "Other monthly income (optional)", "number"],
] as const;

const textareas = [
  [
    "occupantsDescription",
    "Other occupants",
    "List each additional occupant and relationship.",
  ],
  [
    "petsDescription",
    "Pets",
    "Type, breed, and approximate weight, or enter None.",
  ],
  [
    "rentalHistory",
    "Rental history",
    "Summarize your current and recent rental history.",
  ],
] as const;

export function ApplicationFormFields({
  form,
  onChange,
}: {
  form: RentalApplicationForm;
  onChange: (form: RentalApplicationForm) => void;
}) {
  return (
    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
      {fields.map(([field, label, type]) => (
        <div
          key={field}
          className={field === "currentAddress" ? "sm:col-span-2" : undefined}
        >
          <Label htmlFor={`application-${field}`}>{label}</Label>
          <Input
            id={`application-${field}`}
            className="mt-2"
            type={type}
            min={field === "householdSize" ? 1 : type === "number" ? 0 : undefined}
            step={field.includes("Income") ? "0.01" : undefined}
            value={form[field]}
            onChange={(event) =>
              onChange({ ...form, [field]: event.target.value })
            }
            required={!['employerName', 'additionalIncome'].includes(field)}
          />
        </div>
      ))}

      <div className="sm:col-span-2">
        <Label htmlFor="application-employmentStatus">Employment status</Label>
        <select
          id="application-employmentStatus"
          className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
          value={form.employmentStatus}
          onChange={(event) =>
            onChange({ ...form, employmentStatus: event.target.value })
          }
        >
          <option>Full-time employment</option>
          <option>Part-time employment</option>
          <option>Self-employed</option>
          <option>Student</option>
          <option>Retired</option>
          <option>Other lawful income</option>
        </select>
      </div>

      {textareas.map(([field, label, placeholder]) => (
        <div key={field} className="sm:col-span-2">
          <Label htmlFor={`application-${field}`}>{label}</Label>
          <Textarea
            id={`application-${field}`}
            className="mt-2 min-h-24"
            placeholder={placeholder}
            value={form[field]}
            onChange={(event) =>
              onChange({ ...form, [field]: event.target.value })
            }
          />
        </div>
      ))}

      <div>
        <Label htmlFor="application-priorLandlordName">
          Previous landlord (optional)
        </Label>
        <Input
          id="application-priorLandlordName"
          className="mt-2"
          value={form.priorLandlordName}
          onChange={(event) =>
            onChange({ ...form, priorLandlordName: event.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="application-priorLandlordPhone">
          Previous landlord phone (optional)
        </Label>
        <Input
          id="application-priorLandlordPhone"
          className="mt-2"
          type="tel"
          value={form.priorLandlordPhone}
          onChange={(event) =>
            onChange({ ...form, priorLandlordPhone: event.target.value })
          }
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="application-priorLandlordEmail">
          Previous landlord email (optional)
        </Label>
        <Input
          id="application-priorLandlordEmail"
          className="mt-2"
          type="email"
          value={form.priorLandlordEmail}
          onChange={(event) =>
            onChange({ ...form, priorLandlordEmail: event.target.value })
          }
        />
      </div>
    </div>
  );
}
