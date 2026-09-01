CREATE TYPE "LeaseRenewalStatus" AS ENUM ('DRAFT', 'SIGNING', 'SIGNED', 'DECLINED', 'CANCELED', 'EXPIRED', 'FAILED');
CREATE TYPE "NoticeToVacateSource" AS ENUM ('TENANT', 'MANAGEMENT', 'MUTUAL');
CREATE TYPE "NoticeToVacateStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'MOVE_OUT_IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "MoveOutInspectionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'TENANT_ACKNOWLEDGED', 'CANCELED');
CREATE TYPE "MoveOutTurnoverStatus" AS ENUM ('READY_TO_RENT', 'MAINTENANCE_REQUIRED');
CREATE TYPE "SecurityDepositDispositionStatus" AS ENUM ('DRAFT', 'ITEMIZED', 'ISSUED', 'RETURNED', 'DISPUTED');
CREATE TYPE "SecurityDepositDeductionCategory" AS ENUM ('CLEANING', 'DAMAGE', 'UNPAID_RENT', 'LATE_FEES', 'UTILITIES', 'KEY_REPLACEMENT', 'OTHER');
CREATE TYPE "SecurityDepositLedgerEntryType" AS ENUM ('OPENING_BALANCE', 'DEDUCTION', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "SecurityDepositReturnMethod" AS ENUM ('CHECK', 'ACH', 'CASH', 'OTHER');

CREATE TABLE "LeaseRenewal" (
  "id" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "status" "LeaseRenewalStatus" NOT NULL DEFAULT 'DRAFT',
  "proposedStartDate" DATE NOT NULL,
  "proposedEndDate" DATE NOT NULL,
  "proposedMonthlyRent" DECIMAL(12,2) NOT NULL,
  "proposedSecurityDeposit" DECIMAL(12,2) NOT NULL,
  "proposedRentDueDay" INTEGER NOT NULL,
  "proposedGracePeriodDays" INTEGER NOT NULL,
  "proposedLateFeeAmount" DECIMAL(12,2) NOT NULL,
  "offerExpiresAt" TIMESTAMP(3) NOT NULL,
  "internalNotes" TEXT,
  "declineReason" TEXT,
  "envelopeId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaseRenewal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaseRenewal_date_order_check" CHECK ("proposedEndDate" > "proposedStartDate"),
  CONSTRAINT "LeaseRenewal_money_check" CHECK ("proposedMonthlyRent" >= 0 AND "proposedSecurityDeposit" >= 0 AND "proposedLateFeeAmount" >= 0),
  CONSTRAINT "LeaseRenewal_policy_check" CHECK ("proposedRentDueDay" BETWEEN 1 AND 28 AND "proposedGracePeriodDays" BETWEEN 0 AND 30)
);

CREATE TABLE "NoticeToVacate" (
  "id" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "source" "NoticeToVacateSource" NOT NULL,
  "status" "NoticeToVacateStatus" NOT NULL DEFAULT 'SUBMITTED',
  "noticeDate" DATE NOT NULL,
  "plannedMoveOutDate" DATE NOT NULL,
  "reason" TEXT,
  "forwardingAddress" TEXT,
  "createdByUserId" TEXT,
  "acknowledgedByUserId" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NoticeToVacate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NoticeToVacate_date_order_check" CHECK ("plannedMoveOutDate" >= "noticeDate")
);

CREATE TABLE "MoveOutInspection" (
  "id" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "status" "MoveOutInspectionStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "actualMoveOutAt" TIMESTAMP(3),
  "turnoverStatus" "MoveOutTurnoverStatus",
  "keysReturned" BOOLEAN NOT NULL DEFAULT false,
  "staffNotes" TEXT,
  "tenantNotes" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "preparedByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "tenantAcknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveOutInspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveOutInspection_revision_check" CHECK ("revision" > 0)
);

CREATE TABLE "MoveOutInspectionItem" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "condition" "InspectionCondition" NOT NULL DEFAULT 'NOT_INSPECTED',
  "notes" TEXT,
  "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveOutInspectionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveOutInspectionItem_cost_check" CHECK ("estimatedCost" >= 0)
);

CREATE TABLE "SecurityDepositDisposition" (
  "id" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "amountHeld" DECIMAL(12,2) NOT NULL,
  "deductionsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "SecurityDepositDispositionStatus" NOT NULL DEFAULT 'DRAFT',
  "deadlineDays" INTEGER NOT NULL DEFAULT 30,
  "dueDate" DATE NOT NULL,
  "forwardingAddress" TEXT NOT NULL,
  "returnMethod" "SecurityDepositReturnMethod",
  "returnReference" TEXT,
  "issueRequestId" UUID,
  "proofStoragePath" TEXT,
  "proofFileName" TEXT,
  "proofContentType" TEXT,
  "proofSizeBytes" INTEGER,
  "internalNotes" TEXT,
  "disputeReason" TEXT,
  "disputedFromStatus" "SecurityDepositDispositionStatus",
  "createdByUserId" TEXT NOT NULL,
  "itemizedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "disputedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityDepositDisposition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SecurityDepositDisposition_amounts_check" CHECK ("amountHeld" >= 0 AND "deductionsTotal" >= 0 AND "refundAmount" >= 0 AND "deductionsTotal" + "refundAmount" = "amountHeld"),
  CONSTRAINT "SecurityDepositDisposition_deadline_check" CHECK ("deadlineDays" BETWEEN 1 AND 120),
  CONSTRAINT "SecurityDepositDisposition_proof_size_check" CHECK ("proofSizeBytes" IS NULL OR "proofSizeBytes" BETWEEN 1 AND 10485760)
);

CREATE TABLE "SecurityDepositDeduction" (
  "id" TEXT NOT NULL,
  "dispositionId" TEXT NOT NULL,
  "category" "SecurityDepositDeductionCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityDepositDeduction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SecurityDepositDeduction_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "SecurityDepositLedgerEntry" (
  "id" TEXT NOT NULL,
  "dispositionId" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "entryType" "SecurityDepositLedgerEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "idempotencyKey" UUID NOT NULL,
  "postedByUserId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityDepositLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SecurityDepositLedgerEntry_nonzero_check" CHECK ("amount" <> 0)
);

CREATE UNIQUE INDEX "LeaseRenewal_envelopeId_key" ON "LeaseRenewal"("envelopeId");
CREATE INDEX "LeaseRenewal_leaseId_createdAt_id_idx" ON "LeaseRenewal"("leaseId", "createdAt" DESC, "id" DESC);
CREATE INDEX "LeaseRenewal_status_offerExpiresAt_id_idx" ON "LeaseRenewal"("status", "offerExpiresAt", "id");
CREATE INDEX "LeaseRenewal_createdByUserId_idx" ON "LeaseRenewal"("createdByUserId");
CREATE INDEX "NoticeToVacate_leaseId_status_createdAt_id_idx" ON "NoticeToVacate"("leaseId", "status", "createdAt" DESC, "id" DESC);
CREATE INDEX "NoticeToVacate_tenantId_status_plannedMoveOutDate_id_idx" ON "NoticeToVacate"("tenantId", "status", "plannedMoveOutDate", "id");
CREATE INDEX "NoticeToVacate_unitId_status_plannedMoveOutDate_id_idx" ON "NoticeToVacate"("unitId", "status", "plannedMoveOutDate", "id");
CREATE INDEX "NoticeToVacate_createdByUserId_idx" ON "NoticeToVacate"("createdByUserId");
CREATE INDEX "NoticeToVacate_acknowledgedByUserId_idx" ON "NoticeToVacate"("acknowledgedByUserId");
CREATE UNIQUE INDEX "MoveOutInspection_noticeId_key" ON "MoveOutInspection"("noticeId");
CREATE INDEX "MoveOutInspection_leaseId_status_updatedAt_id_idx" ON "MoveOutInspection"("leaseId", "status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "MoveOutInspection_tenantId_status_updatedAt_id_idx" ON "MoveOutInspection"("tenantId", "status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "MoveOutInspection_unitId_status_updatedAt_id_idx" ON "MoveOutInspection"("unitId", "status", "updatedAt" DESC, "id" DESC);
CREATE INDEX "MoveOutInspection_scheduledAt_id_idx" ON "MoveOutInspection"("scheduledAt", "id");
CREATE INDEX "MoveOutInspection_preparedByUserId_idx" ON "MoveOutInspection"("preparedByUserId");
CREATE UNIQUE INDEX "MoveOutInspectionItem_inspectionId_area_name_key" ON "MoveOutInspectionItem"("inspectionId", "area", "name");
CREATE INDEX "MoveOutInspectionItem_inspectionId_sortOrder_id_idx" ON "MoveOutInspectionItem"("inspectionId", "sortOrder", "id");
CREATE UNIQUE INDEX "SecurityDepositDisposition_leaseId_key" ON "SecurityDepositDisposition"("leaseId");
CREATE UNIQUE INDEX "SecurityDepositDisposition_inspectionId_key" ON "SecurityDepositDisposition"("inspectionId");
CREATE UNIQUE INDEX "SecurityDepositDisposition_proofStoragePath_key" ON "SecurityDepositDisposition"("proofStoragePath");
CREATE UNIQUE INDEX "SecurityDepositDisposition_issueRequestId_key" ON "SecurityDepositDisposition"("issueRequestId");
CREATE INDEX "SecurityDepositDisposition_tenantId_status_dueDate_id_idx" ON "SecurityDepositDisposition"("tenantId", "status", "dueDate", "id");
CREATE INDEX "SecurityDepositDisposition_unitId_status_dueDate_id_idx" ON "SecurityDepositDisposition"("unitId", "status", "dueDate", "id");
CREATE INDEX "SecurityDepositDisposition_status_dueDate_id_idx" ON "SecurityDepositDisposition"("status", "dueDate", "id");
CREATE INDEX "SecurityDepositDisposition_createdByUserId_idx" ON "SecurityDepositDisposition"("createdByUserId");
CREATE INDEX "SecurityDepositDeduction_dispositionId_createdAt_id_idx" ON "SecurityDepositDeduction"("dispositionId", "createdAt", "id");
CREATE UNIQUE INDEX "SecurityDepositLedgerEntry_idempotencyKey_key" ON "SecurityDepositLedgerEntry"("idempotencyKey");
CREATE INDEX "SecurityDepositLedgerEntry_dispositionId_occurredAt_id_idx" ON "SecurityDepositLedgerEntry"("dispositionId", "occurredAt", "id");
CREATE INDEX "SecurityDepositLedgerEntry_leaseId_occurredAt_id_idx" ON "SecurityDepositLedgerEntry"("leaseId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "SecurityDepositLedgerEntry_tenantId_occurredAt_id_idx" ON "SecurityDepositLedgerEntry"("tenantId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "SecurityDepositLedgerEntry_unitId_idx" ON "SecurityDepositLedgerEntry"("unitId");
CREATE INDEX "SecurityDepositLedgerEntry_postedByUserId_idx" ON "SecurityDepositLedgerEntry"("postedByUserId");

ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "ESignatureEnvelope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaseRenewal" ADD CONSTRAINT "LeaseRenewal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NoticeToVacate" ADD CONSTRAINT "NoticeToVacate_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NoticeToVacate" ADD CONSTRAINT "NoticeToVacate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NoticeToVacate" ADD CONSTRAINT "NoticeToVacate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NoticeToVacate" ADD CONSTRAINT "NoticeToVacate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NoticeToVacate" ADD CONSTRAINT "NoticeToVacate_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoveOutInspection" ADD CONSTRAINT "MoveOutInspection_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "NoticeToVacate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoveOutInspection" ADD CONSTRAINT "MoveOutInspection_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoveOutInspection" ADD CONSTRAINT "MoveOutInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoveOutInspection" ADD CONSTRAINT "MoveOutInspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoveOutInspection" ADD CONSTRAINT "MoveOutInspection_preparedByUserId_fkey" FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoveOutInspectionItem" ADD CONSTRAINT "MoveOutInspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "MoveOutInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositDisposition" ADD CONSTRAINT "SecurityDepositDisposition_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositDisposition" ADD CONSTRAINT "SecurityDepositDisposition_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "MoveOutInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositDisposition" ADD CONSTRAINT "SecurityDepositDisposition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositDisposition" ADD CONSTRAINT "SecurityDepositDisposition_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositDisposition" ADD CONSTRAINT "SecurityDepositDisposition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositDeduction" ADD CONSTRAINT "SecurityDepositDeduction_dispositionId_fkey" FOREIGN KEY ("dispositionId") REFERENCES "SecurityDepositDisposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositLedgerEntry" ADD CONSTRAINT "SecurityDepositLedgerEntry_dispositionId_fkey" FOREIGN KEY ("dispositionId") REFERENCES "SecurityDepositDisposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositLedgerEntry" ADD CONSTRAINT "SecurityDepositLedgerEntry_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositLedgerEntry" ADD CONSTRAINT "SecurityDepositLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositLedgerEntry" ADD CONSTRAINT "SecurityDepositLedgerEntry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityDepositLedgerEntry" ADD CONSTRAINT "SecurityDepositLedgerEntry_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeaseRenewal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NoticeToVacate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveOutInspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoveOutInspectionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityDepositDisposition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityDepositDeduction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityDepositLedgerEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LeaseRenewal", "NoticeToVacate", "MoveOutInspection", "MoveOutInspectionItem", "SecurityDepositDisposition", "SecurityDepositDeduction", "SecurityDepositLedgerEntry" FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('move-out-documents', 'move-out-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Service role manages move-out documents" ON storage.objects;
CREATE POLICY "Service role manages move-out documents"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'move-out-documents')
WITH CHECK (bucket_id = 'move-out-documents');
