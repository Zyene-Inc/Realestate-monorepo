"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Plus,
  Wrench,
  AlertCircle,
  ArrowRight,
  Camera,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

type ResidentRequest = {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  createdAt: string;
  photoUrls: string[];
};
type RequestForm = { category: string; priority: string; description: string };

function MaintenanceRequestDialog({
  open,
  submitting,
  form,
  photos,
  onOpenChange,
  onFormChange,
  onPhotosChange,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  form: RequestForm;
  photos: File[];
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: RequestForm) => void;
  onPhotosChange: (photos: File[]) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button className="px-8 py-6 rounded-2xl group">
            <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
            New Service Request
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px] rounded-xl p-5 sm:p-6">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              New Service Request
            </DialogTitle>
            <DialogDescription>
              Describe the issue in detail so we can assign the right
              specialist.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-8">
            <div className="space-y-2">
              <Label htmlFor="request-category">Category</Label>
              <select
                id="request-category"
                className="w-full h-12 rounded-xl border border-border bg-secondary/50 px-4"
                value={form.category}
                onChange={(event) =>
                  onFormChange({ ...form, category: event.target.value })
                }
                required
              >
                <option value="">Select category…</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="appliance">Appliance</option>
                <option value="pest">Pest Control</option>
                <option value="structural">Structural</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-priority">Priority level</Label>
              <select
                id="request-priority"
                className="w-full h-12 rounded-xl border border-border bg-secondary/50 px-4"
                value={form.priority}
                onChange={(event) =>
                  onFormChange({ ...form, priority: event.target.value })
                }
                required
              >
                <option value="low">Low - General Maintenance</option>
                <option value="medium">Medium - Needs Attention</option>
                <option value="high">High - Urgent Issue</option>
                <option value="emergency">Emergency - Critical Service</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-description">Issue description</Label>
              <Textarea
                id="request-description"
                className="min-h-[120px] rounded-xl"
                value={form.description}
                onChange={(event) =>
                  onFormChange({ ...form, description: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-photos">Photos (up to 5)</Label>
              <Input
                id="request-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) =>
                  onPhotosChange(
                    Array.from(event.target.files ?? []).slice(0, 5),
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                {photos.length
                  ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected`
                  : "Clear photos help the service team arrive prepared."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-14" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceRequestList({
  requests,
  onConfirm,
}: {
  requests: ResidentRequest[];
  onConfirm: (id: string) => Promise<void>;
}) {
  if (requests.length === 0) {
    return (
      <Card className="border-2 border-dashed p-16 text-center">
        <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          No active maintenance records
        </p>
      </Card>
    );
  }
  return (
    <div className="grid gap-6">
      {requests.map((request) => (
        <Card key={request.id} className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row">
              <div className="flex gap-5">
                <span className="h-fit rounded-2xl bg-primary p-4 text-primary-foreground">
                  <Wrench className="size-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold capitalize">
                      {request.category}
                    </h3>
                    <Badge variant="outline">{request.priority} priority</Badge>
                  </div>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    {request.description}
                  </p>
                  {request.photoUrls.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {request.photoUrls.map((url, index) => (
                        <div
                          key={url}
                          className="relative size-20 overflow-hidden rounded-xl border"
                        >
                          <Image
                            src={url}
                            alt={`${request.category} request photo ${index + 1}`}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-5 text-xs text-muted-foreground">
                    {format(new Date(request.createdAt), "MMM dd, yyyy")} · REQ-
                    {request.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex min-w-40 flex-col items-end gap-4">
                <Badge>{request.status.replaceAll("_", " ")}</Badge>
                {request.status === "completed" ? (
                  <Button
                    variant="outline"
                    onClick={() => void onConfirm(request.id)}
                  >
                    Confirm complete <ArrowRight className="ml-2 size-3" />
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TenantMaintenance() {
  const [requests, setRequests] = useState<ResidentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    category: "",
    priority: "low",
    description: "",
  });

  async function fetchRequests() {
    try {
      const data = await api.get("/tenant/portal/maintenance");
      setRequests(data as ResidentRequest[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load service requests"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api
      .get("/tenant/portal/maintenance")
      .then((data: ResidentRequest[]) => setRequests(data))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load service requests")),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = (await api.post(
        "/tenant/portal/maintenance",
        formData,
      )) as ResidentRequest;
      await Promise.all(
        photos.map(async (photo) => {
          const signed = (await api.post(
            `/tenant/portal/maintenance/${created.id}/photo-upload-url`,
            { fileName: photo.name, contentType: photo.type },
          )) as { bucket: string; path: string; token: string };
          const { error } = await supabase.storage
            .from(signed.bucket)
            .uploadToSignedUrl(signed.path, signed.token, photo, {
              contentType: photo.type,
            });
          if (error) throw error;
          await api.post(`/tenant/portal/maintenance/${created.id}/photos`, {
            path: signed.path,
          });
        }),
      );
      toast.success("Request submitted successfully");
      setOpen(false);
      setFormData({ category: "", priority: "low", description: "" });
      setPhotos([]);
      void fetchRequests();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to submit request"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCompletion = async (id: string) => {
    try {
      await api.patch(`/tenant/portal/maintenance/${id}/confirm`, {});
      toast.success("Completion confirmed");
      await fetchRequests();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to confirm completion"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Maintenance
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Report property issues and track real-time repair status.
          </p>
        </div>

        <MaintenanceRequestDialog
          open={open}
          submitting={submitting}
          form={formData}
          photos={photos}
          onOpenChange={setOpen}
          onFormChange={setFormData}
          onPhotosChange={setPhotos}
          onSubmit={handleSubmit}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <MaintenanceRequestList
            requests={requests}
            onConfirm={confirmCompletion}
          />
        </div>

        <div className="space-y-8">
          <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">
                Support Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex gap-4 group">
                <div className="p-3 bg-secondary rounded-xl h-fit group-hover:bg-primary group-hover:text-primary-foreground transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-300">
                  <Camera className="h-5 w-5 text-muted-foreground inherit-color" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-1 font-heading">
                    Photo Documentation
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Always attach clear photos to help our technicians prepare
                    before arrival.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 group">
                <div className="p-3 bg-secondary rounded-xl h-fit group-hover:bg-primary group-hover:text-primary-foreground transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-300">
                  <AlertCircle className="h-5 w-5 text-muted-foreground inherit-color" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-1 font-heading">
                    Emergency Protocol
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Major leaks, electrical hazards, or lockouts are prioritized
                    immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl bg-primary p-6 text-primary-foreground">
            <h4 className="text-xl font-semibold">
              Critical Emergency?
            </h4>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              If you have a life-safety emergency or major property damage,
              contact our 24/7 priority line.
            </p>
            <a
              href="tel:+18165550147"
              className={buttonVariants({ className: "mt-5 w-full" })}
            >
              Connect to support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
