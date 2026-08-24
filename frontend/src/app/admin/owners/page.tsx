"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Send, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

type Owner = {
  id: string;
  ownerName: string | null;
  companyName: string | null;
  contactEmail: string;
  commissionRate: number;
  payoutStatus: "PENDING_ONBOARDING" | "ACTIVE" | "RESTRICTED" | "DISABLED";
  stripeConnectedAccountId: string | null;
  _count: { properties: number };
};

const emptyOwner = {
  ownerName: "",
  companyName: "",
  contactEmail: "",
  contactPhone: "",
  commissionRate: "10",
};

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [form, setForm] = useState(emptyOwner);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const loadOwners = () =>
    api.get("/property-owners").then((data: Owner[]) => setOwners(data));

  useEffect(() => {
    loadOwners()
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load property owners")),
      )
      .finally(() => setLoading(false));
  }, []);

  async function createOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/property-owners", {
        contactEmail: form.contactEmail.trim(),
        commissionRate: Number(form.commissionRate),
        ...(form.ownerName.trim()
          ? { ownerName: form.ownerName.trim() }
          : {}),
        ...(form.companyName.trim()
          ? { companyName: form.companyName.trim() }
          : {}),
        ...(form.contactPhone.trim()
          ? { contactPhone: form.contactPhone.trim() }
          : {}),
      });
      setForm(emptyOwner);
      await loadOwners();
      toast.success(
        "Property owner created. Send payout onboarding when ready.",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create property owner"));
    } finally {
      setSubmitting(false);
    }
  }

  async function inviteOwner(owner: Owner) {
    setInvitingId(owner.id);
    try {
      await api.post(`/property-owners/${owner.id}/stripe-onboarding`, {});
      await loadOwners();
      toast.success(
        `Secure payout setup was emailed to ${owner.contactEmail}.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to send payout onboarding"));
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Property owners
        </h1>
        <p className="mt-2 font-medium text-muted-foreground">
          Set the management commission per owner, then invite them to securely
          connect their payout bank account.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundPlus className="size-5" />
            Add property owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-x-5 gap-y-5 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={createOwner}
          >
            <div className="grid gap-2">
              <Label htmlFor="owner-name">Owner name</Label>
              <Input
                id="owner-name"
                value={form.ownerName}
                onChange={(event) =>
                  setForm({ ...form, ownerName: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={form.companyName}
                onChange={(event) =>
                  setForm({ ...form, companyName: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-email">Email</Label>
              <Input
                id="owner-email"
                type="email"
                required
                value={form.contactEmail}
                onChange={(event) =>
                  setForm({ ...form, contactEmail: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-phone">Phone (optional)</Label>
              <Input
                id="owner-phone"
                value={form.contactPhone}
                onChange={(event) =>
                  setForm({ ...form, contactPhone: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commission-rate">
                Johnson Realty commission (%)
              </Label>
              <Input
                id="commission-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={form.commissionRate}
                onChange={(event) =>
                  setForm({ ...form, commissionRate: event.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserRoundPlus className="size-4" />
                )}
                Create owner
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Owner payout status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No property owners yet.
            </p>
          ) : (
            owners.map((owner) => (
              <div
                key={owner.id}
                className="flex flex-col gap-4 rounded-xl border border-border p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {owner.companyName || owner.ownerName || "Unnamed owner"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {owner.contactEmail} ·{" "}
                    {Number(owner.commissionRate).toFixed(2)}% Johnson Realty
                    commission · {owner._count.properties} properties
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payout: {owner.payoutStatus.replaceAll("_", " ")}
                  </p>
                </div>
                <Button
                  variant={
                    owner.payoutStatus === "ACTIVE" ? "outline" : "default"
                  }
                  disabled={
                    invitingId !== null || owner.payoutStatus === "ACTIVE"
                  }
                  onClick={() => inviteOwner(owner)}
                >
                  {invitingId === owner.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {owner.payoutStatus === "ACTIVE"
                    ? "Payouts active"
                    : "Send payout setup"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
