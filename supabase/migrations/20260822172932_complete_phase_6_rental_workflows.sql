alter table public."Property"
  add column "publishedAt" timestamp(3);

alter table public."Tenant"
  add column "lastMessageAt" timestamp(3);

alter table public."Message"
  add column "readAt" timestamp(3);

drop index if exists public."Property_listingType_publishStatus_idx";

create index "Property_listingType_publishStatus_updatedAt_id_idx"
  on public."Property" ("listingType", "publishStatus", "updatedAt" desc, "id" desc);

create unique index "Unit_propertyId_unitNumber_key"
  on public."Unit" ("propertyId", "unitNumber");

create index "Unit_propertyId_status_idx"
  on public."Unit" ("propertyId", "status");

create index "Tenant_unitId_status_idx"
  on public."Tenant" ("unitId", "status");

create index "Tenant_lastMessageAt_id_idx"
  on public."Tenant" ("lastMessageAt" desc, "id" desc);

create index "Lease_tenantId_status_endDate_idx"
  on public."Lease" ("tenantId", "status", "endDate");

create index "Lease_unitId_status_idx"
  on public."Lease" ("unitId", "status");

create index "MaintenanceRequest_tenantId_createdAt_id_idx"
  on public."MaintenanceRequest" ("tenantId", "createdAt" desc, "id" desc);

create index "MaintenanceRequest_status_createdAt_id_idx"
  on public."MaintenanceRequest" ("status", "createdAt" desc, "id" desc);

create index "MaintenanceRequest_propertyId_status_idx"
  on public."MaintenanceRequest" ("propertyId", "status");

create index "MaintenanceRequest_assignedVendorId_idx"
  on public."MaintenanceRequest" ("assignedVendorId");

create index "Message_tenantId_createdAt_id_idx"
  on public."Message" ("tenantId", "createdAt" desc, "id" desc);

create index "Message_receiverId_isRead_createdAt_idx"
  on public."Message" ("receiverId", "isRead", "createdAt" desc);

create index "Message_senderId_idx"
  on public."Message" ("senderId");

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'maintenance-media',
  'maintenance-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
