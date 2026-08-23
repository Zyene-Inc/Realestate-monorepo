"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type Property = { id: string; name: string };
type Unit = {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentAmount: number;
  depositAmount: number;
  status: "vacant" | "occupied" | "under_maintenance" | "off_market";
  property: Property;
  tenants: Array<{ id: string; firstName: string; lastName: string }>;
};

const initialForm = {
  propertyId: "",
  unitNumber: "",
  floor: "",
  bedrooms: "1",
  bathrooms: "1",
  squareFeet: "",
  rentAmount: "",
  depositAmount: "",
  availableDate: "",
};

export default function AdminUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    try {
      const [unitRows, propertyRows] = await Promise.all([
        api.get("/admin/units") as Promise<Unit[]>,
        api.get("/admin/properties") as Promise<Property[]>,
      ]);
      setUnits(unitRows);
      setProperties(propertyRows);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load rental units"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get("/admin/units") as Promise<Unit[]>,
      api.get("/admin/properties") as Promise<Property[]>,
    ])
      .then(([unitRows, propertyRows]) => {
        setUnits(unitRows);
        setProperties(propertyRows);
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load rental units")),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return units;
    return units.filter((unit) =>
      `${unit.property.name} ${unit.unitNumber}`.toLowerCase().includes(term),
    );
  }, [query, units]);

  const createUnit = async (event: FormEvent) => {
    event.preventDefault();
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      await api.post("/admin/units", {
        ...form,
        floor: form.floor || undefined,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        squareFeet: Number(form.squareFeet),
        rentAmount: Number(form.rentAmount),
        depositAmount: Number(form.depositAmount),
        availableDate: form.availableDate
          ? new Date(form.availableDate).toISOString()
          : undefined,
      });
      toast.success("Rental unit created");
      setForm(initialForm);
      setOpen(false);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to create unit"));
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const updateStatus = async (unit: Unit, status: Unit["status"]) => {
    try {
      await api.patch(`/admin/units/${unit.id}`, { status });
      toast.success("Unit status updated");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update unit"));
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Rental inventory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Units
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Units connect published properties to invitations, leases, and
            service requests.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={properties.length === 0}
        >
          <Plus aria-hidden="true" /> Add unit
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search rental units"
          className="pl-11"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search property or unit"
        />
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <DoorOpen
              className="mx-auto size-10 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">No units found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a rental property first, then create its units here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((unit) => (
            <Card key={unit.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {unit.property.name}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      Unit {unit.unitNumber}
                    </h2>
                  </div>
                  <Badge
                    variant={unit.status === "vacant" ? "default" : "outline"}
                  >
                    {unit.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-border py-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Beds</dt>
                    <dd className="mt-1 font-semibold">{unit.bedrooms}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Baths</dt>
                    <dd className="mt-1 font-semibold">{unit.bathrooms}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="mt-1 font-semibold">
                      ${unit.rentAmount.toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-muted-foreground">
                  {unit.tenants[0]
                    ? `${unit.tenants[0].firstName} ${unit.tenants[0].lastName}`
                    : "No active resident"}
                </p>
                <Label
                  htmlFor={`unit-status-${unit.id}`}
                  className="mt-4 block"
                >
                  Operational status
                </Label>
                <select
                  id={`unit-status-${unit.id}`}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={unit.status}
                  onChange={(event) =>
                    void updateStatus(
                      unit,
                      event.target.value as Unit["status"],
                    )
                  }
                  disabled={unit.status === "occupied"}
                >
                  <option value="vacant">Vacant</option>
                  <option value="under_maintenance">Under maintenance</option>
                  <option value="off_market">Off market</option>
                  {unit.status === "occupied" ? (
                    <option value="occupied">Occupied</option>
                  ) : null}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  {unit.status === "occupied"
                    ? "Occupied is set by the active lease and cannot be changed here."
                    : "Use this for availability only. Occupied is set automatically when a lease starts."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add rental unit</DialogTitle>
            <DialogDescription>
              The unit becomes available for tenant invitations immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createUnit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="unit-property">Property</Label>
              <select
                id="unit-property"
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.propertyId}
                onChange={(event) =>
                  setForm({ ...form, propertyId: event.target.value })
                }
                required
              >
                <option value="">Choose a rental property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            {(
              [
                ["unitNumber", "Unit number", "text"],
                ["floor", "Floor (optional)", "text"],
                ["bedrooms", "Bedrooms", "number"],
                ["bathrooms", "Bathrooms", "number"],
                ["squareFeet", "Square feet", "number"],
                ["rentAmount", "Monthly rent", "number"],
                ["depositAmount", "Security deposit", "number"],
                ["availableDate", "Available date", "date"],
              ] as const
            ).map(([field, label, type]) => (
              <div key={field}>
                <Label htmlFor={`unit-${field}`}>{label}</Label>
                <Input
                  id={`unit-${field}`}
                  className="mt-2"
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  step={field === "bathrooms" ? "0.5" : undefined}
                  value={form[field]}
                  onChange={(event) =>
                    setForm({ ...form, [field]: event.target.value })
                  }
                  required={!["floor", "availableDate"].includes(field)}
                />
              </div>
            ))}
            <div className="flex justify-end gap-3 border-t border-border pt-5 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : null} Create
                unit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
