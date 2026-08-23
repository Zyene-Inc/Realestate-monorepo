CREATE TYPE "ESignatureProvider" AS ENUM ('VERDOCS');
CREATE TYPE "ESignatureDocumentType" AS ENUM ('LEASE', 'DISCLOSURE', 'AGREEMENT');
CREATE TYPE "ESignatureTargetType" AS ENUM ('TENANT', 'AGENT');
CREATE TYPE "ESignatureEnvelopeStatus" AS ENUM (
  'CREATING',
  'PENDING',
  'IN_PROGRESS',
  'FINALIZING',
  'COMPLETED',
  'DECLINED',
  'CANCELED',
  'EXPIRED',
  'FAILED'
);
CREATE TYPE "ESignatureEventSource" AS ENUM ('LOCAL', 'VERDOCS');
CREATE TYPE "ESignatureStoredDocumentType" AS ENUM ('SIGNED_DOCUMENT', 'CERTIFICATE');

CREATE TABLE "ESignatureEnvelope" (
  "id" TEXT NOT NULL,
  "clientRequestId" UUID NOT NULL,
  "provider" "ESignatureProvider" NOT NULL DEFAULT 'VERDOCS',
  "providerEnvelopeId" UUID,
  "templateId" UUID NOT NULL,
  "documentType" "ESignatureDocumentType" NOT NULL,
  "targetType" "ESignatureTargetType" NOT NULL,
  "status" "ESignatureEnvelopeStatus" NOT NULL DEFAULT 'CREATING',
  "providerStatus" TEXT,
  "title" TEXT NOT NULL,
  "tenantId" TEXT,
  "agentId" TEXT,
  "leaseId" TEXT,
  "propertyId" TEXT,
  "recipientRoleName" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientFirstName" TEXT NOT NULL,
  "recipientLastName" TEXT NOT NULL,
  "recipientStatus" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ESignatureEnvelope_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ESignatureEnvelope_target_consistency" CHECK (
    ("targetType" = 'TENANT' AND "tenantId" IS NOT NULL AND "agentId" IS NULL)
    OR
    ("targetType" = 'AGENT' AND "agentId" IS NOT NULL AND "tenantId" IS NULL)
  ),
  CONSTRAINT "ESignatureEnvelope_lease_consistency" CHECK (
    "documentType" <> 'LEASE'
    OR ("targetType" = 'TENANT' AND "leaseId" IS NOT NULL)
  ),
  CONSTRAINT "ESignatureEnvelope_completed_consistency" CHECK (
    "status" <> 'COMPLETED'
    OR ("completedAt" IS NOT NULL AND "archivedAt" IS NOT NULL)
  )
);

CREATE TABLE "ESignatureEvent" (
  "id" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "source" "ESignatureEventSource" NOT NULL,
  "eventType" TEXT NOT NULL,
  "actor" TEXT,
  "payload" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ESignatureEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ESignatureDocument" (
  "id" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "providerDocumentId" UUID NOT NULL,
  "documentType" "ESignatureStoredDocumentType" NOT NULL,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "providerCreatedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ESignatureDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ESignatureDocument_pdf_only" CHECK ("mime" = 'application/pdf'),
  CONSTRAINT "ESignatureDocument_positive_size" CHECK ("size" > 0),
  CONSTRAINT "ESignatureDocument_sha256" CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "ESignatureEnvelope_clientRequestId_key"
  ON "ESignatureEnvelope"("clientRequestId");
CREATE UNIQUE INDEX "ESignatureEnvelope_providerEnvelopeId_key"
  ON "ESignatureEnvelope"("providerEnvelopeId");
CREATE INDEX "ESignatureEnvelope_createdAt_id_idx"
  ON "ESignatureEnvelope"("createdAt" DESC, "id" DESC);
CREATE INDEX "ESignatureEnvelope_status_createdAt_id_idx"
  ON "ESignatureEnvelope"("status", "createdAt" DESC, "id" DESC);
CREATE INDEX "ESignatureEnvelope_tenantId_createdAt_id_idx"
  ON "ESignatureEnvelope"("tenantId", "createdAt" DESC, "id" DESC);
CREATE INDEX "ESignatureEnvelope_agentId_createdAt_id_idx"
  ON "ESignatureEnvelope"("agentId", "createdAt" DESC, "id" DESC);
CREATE INDEX "ESignatureEnvelope_leaseId_idx"
  ON "ESignatureEnvelope"("leaseId");
CREATE INDEX "ESignatureEnvelope_propertyId_idx"
  ON "ESignatureEnvelope"("propertyId");
CREATE INDEX "ESignatureEnvelope_createdByUserId_idx"
  ON "ESignatureEnvelope"("createdByUserId");

CREATE UNIQUE INDEX "ESignatureEvent_providerEventId_key"
  ON "ESignatureEvent"("providerEventId");
CREATE INDEX "ESignatureEvent_envelopeId_occurredAt_id_idx"
  ON "ESignatureEvent"("envelopeId", "occurredAt", "id");

CREATE UNIQUE INDEX "ESignatureDocument_storagePath_key"
  ON "ESignatureDocument"("storagePath");
CREATE UNIQUE INDEX "ESignatureDocument_envelopeId_providerDocumentId_key"
  ON "ESignatureDocument"("envelopeId", "providerDocumentId");
CREATE INDEX "ESignatureDocument_envelopeId_archivedAt_id_idx"
  ON "ESignatureDocument"("envelopeId", "archivedAt", "id");

ALTER TABLE "ESignatureEnvelope"
  ADD CONSTRAINT "ESignatureEnvelope_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ESignatureEnvelope_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ESignatureEnvelope_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ESignatureEnvelope_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ESignatureEnvelope_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ESignatureEvent"
  ADD CONSTRAINT "ESignatureEvent_envelopeId_fkey"
    FOREIGN KEY ("envelopeId") REFERENCES "ESignatureEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ESignatureDocument"
  ADD CONSTRAINT "ESignatureDocument_envelopeId_fkey"
    FOREIGN KEY ("envelopeId") REFERENCES "ESignatureEnvelope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ESignatureEnvelope" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ESignatureEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ESignatureDocument" ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'signed-documents',
  'signed-documents',
  false,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
