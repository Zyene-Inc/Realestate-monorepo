CREATE TYPE "RentalApplicationStatus" AS ENUM (
  'DRAFT',
  'FEE_PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
  'APPROVED',
  'DENIED',
  'WITHDRAWN'
);

CREATE TYPE "RentalApplicationFeeStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'OPEN',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'DISPUTED'
);

CREATE TYPE "RentalApplicationDocumentType" AS ENUM (
  'GOVERNMENT_ID',
  'INCOME_PROOF',
  'OTHER'
);

CREATE TYPE "RentalApplicationDocumentStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

ALTER TABLE "Property"
ADD COLUMN "applicationFeeAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE "RentalApplication" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "unitId" TEXT,
  "websiteLeadId" TEXT,
  "applicantAccessTokenHash" CHAR(64) NOT NULL,
  "applicantAccessExpiresAt" TIMESTAMP(3) NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "dateOfBirth" DATE NOT NULL,
  "currentAddress" TEXT NOT NULL,
  "currentCity" TEXT NOT NULL,
  "currentState" TEXT NOT NULL,
  "currentZip" TEXT NOT NULL,
  "moveInDate" DATE NOT NULL,
  "householdSize" INTEGER NOT NULL,
  "occupantsDescription" TEXT,
  "petsDescription" TEXT,
  "employmentStatus" TEXT NOT NULL,
  "employerName" TEXT,
  "monthlyGrossIncome" DECIMAL(12, 2) NOT NULL,
  "additionalIncome" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "rentalHistory" TEXT,
  "priorLandlordName" TEXT,
  "priorLandlordEmail" TEXT,
  "priorLandlordPhone" TEXT,
  "status" "RentalApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "feeStatus" "RentalApplicationFeeStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "feeAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "feeCheckoutRequestId" UUID,
  "stripeCheckoutSessionId" TEXT,
  "stripeCheckoutUrl" TEXT,
  "stripeCheckoutExpiresAt" TIMESTAMP(3),
  "stripePaymentIntentId" TEXT,
  "stripeChargeId" TEXT,
  "feePaidAt" TIMESTAMP(3),
  "assignedToUserId" TEXT,
  "assignedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "consentVersion" TEXT NOT NULL,
  "certifiedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "RentalApplicationDocumentType" NOT NULL,
  "status" "RentalApplicationDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "storagePath" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalApplicationNote" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalApplicationNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalApplicationAccessLink" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalApplicationAccessLink_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StripeWebhookEvent"
ADD COLUMN "rentalApplicationId" TEXT;

CREATE UNIQUE INDEX "RentalApplication_websiteLeadId_key" ON "RentalApplication"("websiteLeadId");
CREATE UNIQUE INDEX "RentalApplication_applicantAccessTokenHash_key" ON "RentalApplication"("applicantAccessTokenHash");
CREATE UNIQUE INDEX "RentalApplication_feeCheckoutRequestId_key" ON "RentalApplication"("feeCheckoutRequestId");
CREATE UNIQUE INDEX "RentalApplication_stripeCheckoutSessionId_key" ON "RentalApplication"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "RentalApplication_stripePaymentIntentId_key" ON "RentalApplication"("stripePaymentIntentId");
CREATE UNIQUE INDEX "RentalApplication_stripeChargeId_key" ON "RentalApplication"("stripeChargeId");
CREATE INDEX "RentalApplication_status_updatedAt_id_idx" ON "RentalApplication"("status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "RentalApplication_assignedToUserId_status_updatedAt_id_idx" ON "RentalApplication"("assignedToUserId", "status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "RentalApplication_propertyId_createdAt_id_idx" ON "RentalApplication"("propertyId", "createdAt" DESC, "id" DESC);
CREATE INDEX "RentalApplication_email_createdAt_idx" ON "RentalApplication"("email", "createdAt" DESC);
CREATE INDEX "RentalApplication_feeStatus_updatedAt_id_idx" ON "RentalApplication"("feeStatus", "updatedAt" DESC, "id" DESC);
CREATE UNIQUE INDEX "RentalApplication_propertyId_email_active_key"
ON "RentalApplication"("propertyId", lower("email"))
WHERE "status" IN ('DRAFT', 'FEE_PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'APPROVED');

CREATE UNIQUE INDEX "RentalApplicationDocument_storagePath_key" ON "RentalApplicationDocument"("storagePath");
CREATE INDEX "RentalApplicationDocument_applicationId_type_createdAt_id_idx" ON "RentalApplicationDocument"("applicationId", "type", "createdAt" DESC, "id" DESC);
CREATE INDEX "RentalApplicationDocument_status_createdAt_id_idx" ON "RentalApplicationDocument"("status", "createdAt" DESC, "id" DESC);
CREATE INDEX "RentalApplicationDocument_reviewedByUserId_idx" ON "RentalApplicationDocument"("reviewedByUserId");

CREATE INDEX "RentalApplicationNote_applicationId_createdAt_id_idx" ON "RentalApplicationNote"("applicationId", "createdAt" DESC, "id" DESC);
CREATE INDEX "RentalApplicationNote_authorUserId_idx" ON "RentalApplicationNote"("authorUserId");

CREATE UNIQUE INDEX "RentalApplicationAccessLink_tokenHash_key" ON "RentalApplicationAccessLink"("tokenHash");
CREATE INDEX "RentalApplicationAccessLink_applicationId_expiresAt_id_idx" ON "RentalApplicationAccessLink"("applicationId", "expiresAt" DESC, "id" DESC);
CREATE INDEX "RentalApplicationAccessLink_expiresAt_idx" ON "RentalApplicationAccessLink"("expiresAt");
CREATE INDEX "StripeWebhookEvent_rentalApplicationId_createdAt_id_idx" ON "StripeWebhookEvent"("rentalApplicationId", "createdAt" DESC, "id" DESC);

ALTER TABLE "RentalApplication"
ADD CONSTRAINT "RentalApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplication_websiteLeadId_fkey" FOREIGN KEY ("websiteLeadId") REFERENCES "WebsiteLead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplication_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RentalApplicationDocument"
ADD CONSTRAINT "RentalApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplicationDocument_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RentalApplicationNote"
ADD CONSTRAINT "RentalApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "RentalApplicationNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RentalApplicationAccessLink"
ADD CONSTRAINT "RentalApplicationAccessLink_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeWebhookEvent"
ADD CONSTRAINT "StripeWebhookEvent_rentalApplicationId_fkey" FOREIGN KEY ("rentalApplicationId") REFERENCES "RentalApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rental-application-documents',
  'rental-application-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public rental application document access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated rental application document access" ON storage.objects;
