CREATE TYPE "CommissionPaymentMethod" AS ENUM ('ACH', 'CASH', 'CHECK', 'WIRE', 'OTHER');
CREATE TYPE "SaleCommissionStatus" AS ENUM ('ACTIVE', 'VOIDED');
CREATE TYPE "SaleCommissionEventType" AS ENUM ('CREATED', 'CORRECTED', 'VOIDED');

CREATE TABLE "SaleCommission" (
    "id" TEXT NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "salePrice" DECIMAL(14,2),
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "CommissionPaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "status" "SaleCommissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "recordedByUserId" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleCommission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaleCommission_positive_commission" CHECK ("commissionAmount" > 0),
    CONSTRAINT "SaleCommission_positive_sale_price" CHECK ("salePrice" IS NULL OR "salePrice" > 0),
    CONSTRAINT "SaleCommission_usd_only" CHECK ("currency" = 'USD'),
    CONSTRAINT "SaleCommission_void_consistency" CHECK (
      ("status" = 'ACTIVE' AND "voidedAt" IS NULL AND "voidReason" IS NULL AND "voidedByUserId" IS NULL)
      OR
      ("status" = 'VOIDED' AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND "voidedByUserId" IS NOT NULL)
    )
);

CREATE TABLE "SaleCommissionEvent" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "type" "SaleCommissionEventType" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleCommissionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaleCommission_idempotencyKey_key" ON "SaleCommission"("idempotencyKey");
CREATE INDEX "SaleCommission_receivedAt_id_idx" ON "SaleCommission"("receivedAt" DESC, "id" DESC);
CREATE INDEX "SaleCommission_status_receivedAt_id_idx" ON "SaleCommission"("status", "receivedAt" DESC, "id" DESC);
CREATE INDEX "SaleCommission_propertyId_idx" ON "SaleCommission"("propertyId");
CREATE INDEX "SaleCommission_agentId_receivedAt_id_idx" ON "SaleCommission"("agentId", "receivedAt" DESC, "id" DESC);
CREATE INDEX "SaleCommission_recordedByUserId_idx" ON "SaleCommission"("recordedByUserId");
CREATE INDEX "SaleCommission_voidedByUserId_idx" ON "SaleCommission"("voidedByUserId");
CREATE INDEX "SaleCommissionEvent_commissionId_createdAt_id_idx" ON "SaleCommissionEvent"("commissionId", "createdAt", "id");
CREATE INDEX "SaleCommissionEvent_actorUserId_idx" ON "SaleCommissionEvent"("actorUserId");

ALTER TABLE "SaleCommission"
  ADD CONSTRAINT "SaleCommission_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SaleCommission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SaleCommission_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SaleCommission_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleCommissionEvent"
  ADD CONSTRAINT "SaleCommissionEvent_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "SaleCommission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SaleCommissionEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleCommission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleCommissionEvent" ENABLE ROW LEVEL SECURITY;
