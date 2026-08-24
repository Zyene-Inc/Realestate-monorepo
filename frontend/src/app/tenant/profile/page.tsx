"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Car,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldAlert,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function TenantProfile() {
  const { user } = useAuth();
  const profile = user?.tenantProfile;
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const fields = new FormData(event.currentTarget);
    try {
      await api.patch("/tenant/portal/profile", {
        firstName: String(fields.get("firstName") ?? "").trim(),
        lastName: String(fields.get("lastName") ?? "").trim(),
        phone: String(fields.get("phone") ?? "").trim(),
        vehicleInfo: String(fields.get("vehicleInfo") ?? "").trim(),
        petInfo: String(fields.get("petInfo") ?? "").trim(),
        emergencyContactName: String(
          fields.get("emergencyContactName") ?? "",
        ).trim(),
        emergencyContactPhone: String(
          fields.get("emergencyContactPhone") ?? "",
        ).trim(),
      });
      toast.success("Profile information saved");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to save profile information"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 sm:space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Profile settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your contact, household, and emergency information current.
        </p>
      </div>

      <form
        key={profile?.id ?? "tenant-profile"}
        className="space-y-6"
        onSubmit={save}
      >
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <User className="size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Contact information</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Management uses these details for lease and service updates.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-first-name">First name</Label>
                <Input
                  id="profile-first-name"
                  name="firstName"
                  autoComplete="given-name"
                  defaultValue={profile?.firstName ?? ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-last-name">Last name</Label>
                <Input
                  id="profile-last-name"
                  name="lastName"
                  autoComplete="family-name"
                  defaultValue={profile?.lastName ?? ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email address</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="profile-email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="pl-11"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact management to change your sign-in email.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-phone">Phone number</Label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    defaultValue={profile?.phone ?? ""}
                    placeholder="(555) 000-0000"
                    className="pl-11"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Household details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your assigned unit is managed by staff. You can update vehicle
                  and pet notes here.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-sm font-medium">
                {profile?.unitId
                  ? `Assigned unit reference: ${profile.unitId}`
                  : "No unit is currently assigned"}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="vehicle-info">
                  <Car className="mr-2 inline size-4" aria-hidden="true" />
                  Vehicle information
                </Label>
                <Input
                  id="vehicle-info"
                  name="vehicleInfo"
                  defaultValue={profile?.vehicleInfo ?? ""}
                  placeholder="Year, color, model, and plate"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pet-info">Pet information</Label>
                <Input
                  id="pet-info"
                  name="petInfo"
                  defaultValue={profile?.petInfo ?? ""}
                  placeholder="Animal, breed, and name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Emergency contact</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Provide someone management may contact during an emergency.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="emergency-name">Contact name</Label>
                <Input
                  id="emergency-name"
                  name="emergencyContactName"
                  autoComplete="name"
                  defaultValue={profile?.emergencyContactName ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency-phone">Phone number</Label>
                <Input
                  id="emergency-phone"
                  name="emergencyContactPhone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={profile?.emergencyContactPhone ?? ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/tenant/messages" />}
          >
            <MessageSquareText aria-hidden="true" />
            Contact management
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
