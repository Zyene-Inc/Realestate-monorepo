"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

type MaintenanceRequest = {
  id: string;
  status: string;
  category: string;
  description: string;
  priority: string;
  createdAt: string;
  photoUrls: string[];
  tenant: { firstName: string; lastName: string };
  unit: { unitNumber: string };
  property: { name: string };
};

export default function AdminMaintenance() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const filteredRequests = requests.filter((request) =>
    `${request.tenant.firstName} ${request.tenant.lastName} ${request.property.name} ${request.unit.unitNumber} ${request.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  async function fetchRequests() {
    try {
      const data = await api.get("/admin/maintenance");
      setRequests(data as MaintenanceRequest[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load service requests"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api
      .get("/admin/maintenance")
      .then((data: MaintenanceRequest[]) => setRequests(data))
      .catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Unable to load service requests")),
      )
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/maintenance/${id}`, { status });
      toast.success("Status updated");
      void fetchRequests();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update status"));
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
            Manage and track property service requests.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            aria-label="Search service requests"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-[background-color,color,border-color,box-shadow,transform,opacity] font-medium"
            placeholder="Search requests"
          />
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-[1.25rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">
                Status
              </TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">
                Request Details
              </TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">
                Tenant/Unit
              </TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">
                Priority
              </TableHead>
              <TableHead className="font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">
                Submitted
              </TableHead>
              <TableHead className="text-right font-heading font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-5">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground font-medium italic uppercase tracking-widest text-[10px] font-heading"
                >
                  No active requests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => (
                <TableRow
                  key={req.id}
                  className="hover:bg-secondary/30 transition-colors border-border"
                >
                  <TableCell className="py-4">
                    <Badge
                      className={cn(
                        "font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-md border-transparent",
                        req.status === "completed"
                          ? "bg-success/10 text-success"
                          : req.status === "in_progress"
                            ? "bg-accent/10 text-accent"
                            : "bg-primary text-primary-foreground",
                      )}
                    >
                      {req.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground font-heading">
                        {req.category}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-1 line-clamp-1 max-w-[200px]">
                        {req.description}
                      </span>
                      {req.photoUrls?.[0] ? (
                        <Image
                          src={req.photoUrls[0]}
                          alt={`${req.category} request`}
                          width={64}
                          height={48}
                          className="mt-2 h-12 w-16 rounded-lg object-cover"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground font-heading">
                        {req.tenant.firstName} {req.tenant.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 font-heading">
                        Unit {req.unit.unitNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {req.priority === "emergency" ? (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      ) : req.priority === "high" ? (
                        <Clock className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest font-heading",
                          req.priority === "emergency"
                            ? "text-destructive"
                            : req.priority === "high"
                              ? "text-warning"
                              : "text-muted-foreground",
                        )}
                      >
                        {req.priority}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">
                    {format(new Date(req.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <select
                      aria-label={`Update status for ${req.category} request from ${req.tenant.firstName} ${req.tenant.lastName}`}
                      className="text-[10px] font-bold uppercase tracking-widest bg-secondary text-foreground border-transparent rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary font-heading cursor-pointer hover:bg-secondary/80 transition-colors"
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value)}
                    >
                      <option value="submitted">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="assigned">Assigned</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="tenant_confirmed">Tenant Confirmed</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
