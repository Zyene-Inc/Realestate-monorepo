"use client";

import { type FormEvent, useRef, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@/lib/api";
import { toast } from "sonner";

const initialForm = { firstName: "", lastName: "", email: "" };

export default function TenantAdministratorsPage() {
  const [form, setForm] = useState(initialForm);
  const [inviting, setInviting] = useState(false);
  const invitingRef = useRef(false);

  const inviteTenantAdministrator = async (event: FormEvent) => {
    event.preventDefault();
    if (invitingRef.current) return;

    invitingRef.current = true;
    setInviting(true);
    try {
      await api.post("/auth/tenant-admin-invite", form);
      toast.success("Tenant administrator invitation sent");
      setForm(initialForm);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Unable to invite tenant administrator"),
      );
    } finally {
      invitingRef.current = false;
      setInviting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 sm:space-y-10">
      <div>
        <p className="text-sm font-semibold text-primary">Super Admin only</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Tenant administrators
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Invite a trusted staff member to manage rental operations. They will
          receive a one-time secure link to set their password and access the
          rental administration portal.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            Invite a tenant administrator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={inviteTenantAdministrator}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tenant-admin-first-name">First name</Label>
                <Input
                  id="tenant-admin-first-name"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-admin-last-name">Last name</Label>
                <Input
                  id="tenant-admin-last-name"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-admin-email">Work email</Label>
              <Input
                id="tenant-admin-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={inviting}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {inviting
                ? "Sending invitation…"
                : "Send administrator invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
