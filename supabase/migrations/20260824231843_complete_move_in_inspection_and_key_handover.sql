CREATE TYPE "MoveInInspectionStatus" AS ENUM (
  'DRAFT',
  'READY_FOR_TENANT',
  'COMPLETED',
  'CANCELED'
);

CREATE TYPE "InspectionCondition" AS ENUM (
  'NOT_INSPECTED',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
  'NOT_APPLICABLE'
);

CREATE TYPE "InspectionPhotoSource" AS ENUM ('STAFF', 'TENANT');
CREATE TYPE "InspectionMeterType" AS ENUM ('ELECTRIC', 'GAS', 'WATER', 'OTHER');
CREATE TYPE "InspectionKeyType" AS ENUM (
  'UNIT',
  'MAILBOX',
  'GARAGE',
  'FOB',
  'ACCESS_CARD',
  'OTHER'
);

CREATE TABLE "MoveInInspection" (
  "id" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "status" "MoveInInspectionStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "staffNotes" TEXT,
  "noPhysicalKeys" BOOLEAN NOT NULL DEFAULT false,
  "accessMethodNotes" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "checklistVersion" INTEGER NOT NULL DEFAULT 1,
  "preparedByUserId" TEXT NOT NULL,
  "readyForTenantAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveInInspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspection_revision_positive_check" CHECK ("revision" > 0),
  CONSTRAINT "MoveInInspection_checklist_version_positive_check" CHECK ("checklistVersion" > 0),
  CONSTRAINT "MoveInInspection_status_dates_check" CHECK (
    ("status" = 'DRAFT' AND "readyForTenantAt" IS NULL AND "completedAt" IS NULL AND "canceledAt" IS NULL)
    OR ("status" = 'READY_FOR_TENANT' AND "readyForTenantAt" IS NOT NULL AND "completedAt" IS NULL AND "canceledAt" IS NULL)
    OR ("status" = 'COMPLETED' AND "readyForTenantAt" IS NOT NULL AND "completedAt" IS NOT NULL AND "canceledAt" IS NULL)
    OR ("status" = 'CANCELED' AND "completedAt" IS NULL AND "canceledAt" IS NOT NULL)
  )
);

CREATE TABLE "MoveInInspectionArea" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveInInspectionArea_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspectionArea_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "MoveInInspectionItem" (
  "id" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "condition" "InspectionCondition" NOT NULL DEFAULT 'NOT_INSPECTED',
  "staffNotes" TEXT,
  "tenantCondition" "InspectionCondition",
  "tenantNotes" TEXT,
  "tenantObservedAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveInInspectionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspectionItem_sort_order_check" CHECK ("sortOrder" >= 0),
  CONSTRAINT "MoveInInspectionItem_tenant_observation_check" CHECK (
    ("tenantCondition" IS NULL AND "tenantNotes" IS NULL AND "tenantObservedAt" IS NULL)
    OR ("tenantObservedAt" IS NOT NULL)
  )
);

CREATE TABLE "MoveInInspectionMeterReading" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "type" "InspectionMeterType" NOT NULL,
  "label" TEXT NOT NULL,
  "reading" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveInInspectionMeterReading_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspectionMeterReading_reading_check" CHECK ("reading" >= 0),
  CONSTRAINT "MoveInInspectionMeterReading_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "MoveInInspectionKey" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "type" "InspectionKeyType" NOT NULL,
  "label" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "identifier" TEXT,
  "notes" TEXT,
  "handedOverAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveInInspectionKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspectionKey_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "MoveInInspectionKey_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "MoveInInspectionPhoto" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "itemId" TEXT,
  "meterReadingId" TEXT,
  "source" "InspectionPhotoSource" NOT NULL,
  "storagePath" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "caption" TEXT,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoveInInspectionPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspectionPhoto_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 8388608),
  CONSTRAINT "MoveInInspectionPhoto_attachment_check" CHECK (
    NOT ("itemId" IS NOT NULL AND "meterReadingId" IS NOT NULL)
  ),
  CONSTRAINT "MoveInInspectionPhoto_content_type_check" CHECK (
    "contentType" IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic')
  )
);

CREATE TABLE "MoveInInspectionAcknowledgement" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "acknowledgedByUserId" TEXT NOT NULL,
  "typedName" TEXT NOT NULL,
  "statementVersion" INTEGER NOT NULL,
  "statementText" TEXT NOT NULL,
  "inspectionRevision" INTEGER NOT NULL,
  "tenantNotes" TEXT,
  "recordSnapshot" JSONB NOT NULL,
  "recordSha256" CHAR(64) NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoveInInspectionAcknowledgement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInInspectionAcknowledgement_version_check" CHECK (
    "statementVersion" > 0 AND "inspectionRevision" > 0
  ),
  CONSTRAINT "MoveInInspectionAcknowledgement_hash_check" CHECK (
    "recordSha256" ~ '^[0-9a-f]{64}$'
  )
);

CREATE UNIQUE INDEX "MoveInInspection_leaseId_key"
  ON "MoveInInspection"("leaseId");
CREATE INDEX "MoveInInspection_status_updatedAt_id_idx"
  ON "MoveInInspection"("status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "MoveInInspection_scheduledAt_id_idx"
  ON "MoveInInspection"("scheduledAt", "id");
CREATE INDEX "MoveInInspection_tenantId_status_updatedAt_id_idx"
  ON "MoveInInspection"("tenantId", "status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "MoveInInspection_unitId_createdAt_id_idx"
  ON "MoveInInspection"("unitId", "createdAt" DESC, "id" DESC);
CREATE INDEX "MoveInInspection_preparedByUserId_idx"
  ON "MoveInInspection"("preparedByUserId");

CREATE UNIQUE INDEX "MoveInInspectionArea_inspectionId_name_key"
  ON "MoveInInspectionArea"("inspectionId", "name");
CREATE INDEX "MoveInInspectionArea_inspectionId_sortOrder_id_idx"
  ON "MoveInInspectionArea"("inspectionId", "sortOrder", "id");

CREATE UNIQUE INDEX "MoveInInspectionItem_areaId_name_key"
  ON "MoveInInspectionItem"("areaId", "name");
CREATE INDEX "MoveInInspectionItem_areaId_sortOrder_id_idx"
  ON "MoveInInspectionItem"("areaId", "sortOrder", "id");

CREATE INDEX "MoveInInspectionMeterReading_inspectionId_sortOrder_id_idx"
  ON "MoveInInspectionMeterReading"("inspectionId", "sortOrder", "id");
CREATE INDEX "MoveInInspectionKey_inspectionId_sortOrder_id_idx"
  ON "MoveInInspectionKey"("inspectionId", "sortOrder", "id");

CREATE UNIQUE INDEX "MoveInInspectionPhoto_storagePath_key"
  ON "MoveInInspectionPhoto"("storagePath");
CREATE INDEX "MoveInInspectionPhoto_inspectionId_createdAt_id_idx"
  ON "MoveInInspectionPhoto"("inspectionId", "createdAt", "id");
CREATE INDEX "MoveInInspectionPhoto_itemId_createdAt_id_idx"
  ON "MoveInInspectionPhoto"("itemId", "createdAt", "id");
CREATE INDEX "MoveInInspectionPhoto_meterReadingId_createdAt_id_idx"
  ON "MoveInInspectionPhoto"("meterReadingId", "createdAt", "id");
CREATE INDEX "MoveInInspectionPhoto_uploadedByUserId_idx"
  ON "MoveInInspectionPhoto"("uploadedByUserId");

CREATE UNIQUE INDEX "MoveInInspectionAcknowledgement_inspectionId_key"
  ON "MoveInInspectionAcknowledgement"("inspectionId");
CREATE INDEX "MoveInInspectionAcknowledgement_tenantId_acknowledgedAt_id_idx"
  ON "MoveInInspectionAcknowledgement"("tenantId", "acknowledgedAt" DESC, "id" DESC);
CREATE INDEX "MoveInInspectionAcknowledgement_acknowledgedByUserId_idx"
  ON "MoveInInspectionAcknowledgement"("acknowledgedByUserId");

ALTER TABLE "MoveInInspection"
  ADD CONSTRAINT "MoveInInspection_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspection_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspection_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspection_preparedByUserId_fkey"
    FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoveInInspectionArea"
  ADD CONSTRAINT "MoveInInspectionArea_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "MoveInInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoveInInspectionItem"
  ADD CONSTRAINT "MoveInInspectionItem_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "MoveInInspectionArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoveInInspectionMeterReading"
  ADD CONSTRAINT "MoveInInspectionMeterReading_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "MoveInInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoveInInspectionKey"
  ADD CONSTRAINT "MoveInInspectionKey_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "MoveInInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoveInInspectionPhoto"
  ADD CONSTRAINT "MoveInInspectionPhoto_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "MoveInInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspectionPhoto_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "MoveInInspectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspectionPhoto_meterReadingId_fkey"
    FOREIGN KEY ("meterReadingId") REFERENCES "MoveInInspectionMeterReading"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspectionPhoto_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoveInInspectionAcknowledgement"
  ADD CONSTRAINT "MoveInInspectionAcknowledgement_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "MoveInInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspectionAcknowledgement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInInspectionAcknowledgement_acknowledgedByUserId_fkey"
    FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoveInInspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveInInspectionArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveInInspectionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveInInspectionMeterReading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveInInspectionKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveInInspectionPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveInInspectionAcknowledgement" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "MoveInInspection" FROM anon, authenticated;
REVOKE ALL ON TABLE "MoveInInspectionArea" FROM anon, authenticated;
REVOKE ALL ON TABLE "MoveInInspectionItem" FROM anon, authenticated;
REVOKE ALL ON TABLE "MoveInInspectionMeterReading" FROM anon, authenticated;
REVOKE ALL ON TABLE "MoveInInspectionKey" FROM anon, authenticated;
REVOKE ALL ON TABLE "MoveInInspectionPhoto" FROM anon, authenticated;
REVOKE ALL ON TABLE "MoveInInspectionAcknowledgement" FROM anon, authenticated;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'move-in-inspection-media',
  'move-in-inspection-media',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
