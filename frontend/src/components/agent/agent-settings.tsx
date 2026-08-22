"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

type AgentProfile = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  verificationDocuments: string[];
};

export function AgentSettings({
  documentsOnly = false,
}: {
  documentsOnly?: boolean;
}) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [workingIndex, setWorkingIndex] = useState<number | null>(null);

  useEffect(() => {
    api
      .get("/agents/me")
      .then((value: AgentProfile) => {
        setProfile(value);
        setCompanyName(value.companyName);
        setContactName(value.contactName);
        setPhone(value.phone ?? "");
      })
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load agent profile")),
      )
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = (await api.patch("/agents/me", {
        companyName,
        contactName,
        phone,
      })) as AgentProfile;
      setProfile(updated);
      toast.success("Company profile updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Documents must be 10 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const signed = (await api.post("/agents/me/document-upload-url", {
        fileName: file.name,
        contentType: file.type,
      })) as { bucket: string; path: string; token: string };
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw error;
      const updated = (await api.post("/agents/me/documents", {
        path: signed.path,
      })) as AgentProfile;
      setProfile(updated);
      toast.success("Verification document uploaded");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to upload document"));
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (index: number) => {
    setWorkingIndex(index);
    try {
      const result = (await api.get(`/agents/me/documents/${index}/url`)) as {
        url: string;
      };
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to open document"));
    } finally {
      setWorkingIndex(null);
    }
  };

  const removeDocument = async (index: number) => {
    setWorkingIndex(index);
    try {
      const updated = (await api.delete(
        `/agents/me/documents/${index}`,
      )) as AgentProfile;
      setProfile(updated);
      toast.success("Verification document removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to remove document"));
    } finally {
      setWorkingIndex(null);
    }
  };

  if (loading) return <Loader2 className="mx-auto h-7 w-7 animate-spin" />;
  if (!profile) return null;

  return (
    <div className="space-y-8">
      {!documentsOnly && (
        <form onSubmit={save}>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Company profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-company-name">Company name</Label>
                <Input
                  id="settings-company-name"
                  name="companyName"
                  autoComplete="organization"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-contact-name">Primary contact</Label>
                <Input
                  id="settings-contact-name"
                  name="contactName"
                  autoComplete="name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" name="email" type="email" autoComplete="email" value={profile.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save company profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Account verification documents</CardTitle>
          <p className="text-sm text-muted-foreground">
            PDF, JPEG, PNG, or WebP. Files are private to your company and
            Johnson Realty sales reviewers.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/88 has-[:disabled]:opacity-50">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload verification document
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </label>
          {profile.verificationDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center"><FileText className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">No verification documents uploaded.</p></div>
          ) : (
            <div className="divide-y rounded-xl border">
              {profile.verificationDocuments.map((path, index) => (
                <div key={path} className="flex flex-wrap items-center gap-3 p-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    Document {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openDocument(index)}
                    disabled={workingIndex === index}
                  >
                    <Download className="mr-2 h-4 w-4" /> Open
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeDocument(index)}
                    disabled={workingIndex === index}
                    aria-label={`Remove document ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
