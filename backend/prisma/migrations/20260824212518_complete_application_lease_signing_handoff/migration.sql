CREATE TYPE "RentalApplicationHandoffStatus" AS ENUM (
  'STARTED',
  'TENANT_INVITED',
  'LEASE_CREATED',
  'ENVELOPE_CREATING',
  'ENVELOPE_SENT',
  'SIGNED',
  'ACTION_REQUIRED',
  'FAILED'
);

ALTER TABLE "Lease"
ADD COLUMN "rentalApplicationId" TEXT;

CREATE TABLE "RentalApplicationHandoff" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "tenantId" TEXT,
  "leaseId" TEXT,
  "envelopeId" TEXT,
  "initiatedByUserId" TEXT NOT NULL,
  "clientRequestId" UUID NOT NULL,
  "requestFingerprint" CHAR(64) NOT NULL,
  "envelopeClientRequestId" UUID,
  "status" "RentalApplicationHandoffStatus" NOT NULL DEFAULT 'STARTED',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "failureStage" TEXT,
  "failureReason" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantInvitedAt" TIMESTAMP(3),
  "leaseCreatedAt" TIMESTAMP(3),
  "envelopeSentAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalApplicationHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lease_rentalApplicationId_key" ON "Lease"("rentalApplicationId");
CREATE UNIQUE INDEX "RentalApplicationHandoff_applicationId_key" ON "RentalApplicationHandoff"("applicationId");
CREATE UNIQUE INDEX "RentalApplicationHandoff_leaseId_key" ON "RentalApplicationHandoff"("leaseId");
CREATE UNIQUE INDEX "RentalApplicationHandoff_envelopeId_key" ON "RentalApplicationHandoff"("envelopeId");
CREATE UNIQUE INDEX "RentalApplicationHandoff_clientRequestId_key" ON "RentalApplicationHandoff"("clientRequestId");
CREATE UNIQUE INDEX "RentalApplicationHandoff_envelopeClientRequestId_key" ON "RentalApplicationHandoff"("envelopeClientRequestId");
CREATE INDEX "RentalApplicationHandoff_status_updatedAt_id_idx" ON "RentalApplicationHandoff"("status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "RentalApplicationHandoff_tenantId_updatedAt_id_idx" ON "RentalApplicationHandoff"("tenantId", "updatedAt" DESC, "id" DESC);
CREATE INDEX "RentalApplicationHandoff_initiatedByUserId_idx" ON "RentalApplicationHandoff"("initiatedByUserId");

CREATE UNIQUE INDEX "ESignatureEnvelope_active_lease_document_key"
ON "ESignatureEnvelope"("leaseId")
WHERE "leaseId" IS NOT NULL
  AND "documentType" = 'LEASE'
  AND "status" IN ('CREATING', 'PENDING', 'IN_PROGRESS', 'FINALIZING', 'COMPLETED');

ALTER TABLE "Lease"
ADD CONSTRAINT "Lease_rentalApplicationId_fkey"
FOREIGN KEY ("rentalApplicationId") REFERENCES "RentalApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RentalApplicationHandoff"
ADD CONSTRAINT "RentalApplicationHandoff_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplicationHandoff_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplicationHandoff_leaseId_fkey"
FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplicationHandoff_envelopeId_fkey"
FOREIGN KEY ("envelopeId") REFERENCES "ESignatureEnvelope"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplicationHandoff_initiatedByUserId_fkey"
FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RentalApplicationHandoff" ENABLE ROW LEVEL SECURITY;
