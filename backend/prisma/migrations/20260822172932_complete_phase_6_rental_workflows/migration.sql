alter table "Property"
  add column "publishedAt" timestamp(3);

alter table "Tenant"
  add column "lastMessageAt" timestamp(3);

alter table "Message"
  add column "readAt" timestamp(3);

drop index if exists "Property_listingType_publishStatus_idx";

create index "Property_listingType_publishStatus_updatedAt_id_idx"
  on "Property" ("listingType", "publishStatus", "updatedAt" desc, "id" desc);

create unique index "Unit_propertyId_unitNumber_key"
  on "Unit" ("propertyId", "unitNumber");

create index "Unit_propertyId_status_idx"
  on "Unit" ("propertyId", "status");

create index "Tenant_unitId_status_idx"
  on "Tenant" ("unitId", "status");

create index "Tenant_lastMessageAt_id_idx"
  on "Tenant" ("lastMessageAt" desc, "id" desc);

create index "Lease_tenantId_status_endDate_idx"
  on "Lease" ("tenantId", "status", "endDate");

create index "Lease_unitId_status_idx"
  on "Lease" ("unitId", "status");

create index "MaintenanceRequest_tenantId_createdAt_id_idx"
  on "MaintenanceRequest" ("tenantId", "createdAt" desc, "id" desc);

create index "MaintenanceRequest_status_createdAt_id_idx"
  on "MaintenanceRequest" ("status", "createdAt" desc, "id" desc);

create index "MaintenanceRequest_propertyId_status_idx"
  on "MaintenanceRequest" ("propertyId", "status");

create index "MaintenanceRequest_assignedVendorId_idx"
  on "MaintenanceRequest" ("assignedVendorId");

create index "Message_tenantId_createdAt_id_idx"
  on "Message" ("tenantId", "createdAt" desc, "id" desc);

create index "Message_receiverId_isRead_createdAt_idx"
  on "Message" ("receiverId", "isRead", "createdAt" desc);

create index "Message_senderId_idx"
  on "Message" ("senderId");
