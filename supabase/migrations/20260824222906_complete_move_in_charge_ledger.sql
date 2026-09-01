CREATE TYPE "PaymentPurpose" AS ENUM ('RENT', 'MOVE_IN');

CREATE TYPE "MoveInChargeCategory" AS ENUM (
  'FIRST_MONTH_RENT',
  'SECURITY_DEPOSIT',
  'PET_FEE',
  'UTILITY',
  'MOVE_IN_FEE',
  'OTHER'
);

CREATE TYPE "MoveInChargePayoutTreatment" AS ENUM (
  'OWNER_NET_OF_COMMISSION',
  'OWNER_FULL',
  'JOHNSON_REALTY'
);

CREATE TYPE "MoveInChargeStatus" AS ENUM (
  'OPEN',
  'PARTIAL',
  'PAID',
  'WAIVED',
  'VOID'
);

CREATE TYPE "MoveInChargeSource" AS ENUM (
  'LEASE_ACTIVATION',
  'MANUAL'
);

ALTER TABLE "Payment"
  ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'RENT',
  ADD COLUMN "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "MoveInCharge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "propertyOwnerId" TEXT,
  "category" "MoveInChargeCategory" NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "waivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(12,2) NOT NULL,
  "payoutTreatment" "MoveInChargePayoutTreatment" NOT NULL,
  "commissionRate" DECIMAL(5,2),
  "status" "MoveInChargeStatus" NOT NULL DEFAULT 'OPEN',
  "source" "MoveInChargeSource" NOT NULL DEFAULT 'MANUAL',
  "billingPeriod" DATE,
  "dueDate" DATE NOT NULL,
  "idempotencyKey" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestFingerprint" CHAR(64),
  "lastAdjustmentRequestId" UUID,
  "lastAdjustmentFingerprint" CHAR(64),
  "postedByUserId" TEXT NOT NULL,
  "adjustedByUserId" TEXT,
  "adjustmentReason" TEXT,
  "waivedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveInCharge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MoveInCharge_amount_positive_check" CHECK ("amount" > 0),
  CONSTRAINT "MoveInCharge_money_nonnegative_check" CHECK (
    "paidAmount" >= 0
    AND "waivedAmount" >= 0
    AND "refundedAmount" >= 0
    AND "balanceDue" >= 0
  ),
  CONSTRAINT "MoveInCharge_refund_not_overpaid_check" CHECK (
    "refundedAmount" <= "paidAmount"
  ),
  CONSTRAINT "MoveInCharge_balance_equation_check" CHECK (
    "balanceDue" = "amount" - ("paidAmount" - "refundedAmount") - "waivedAmount"
  )
);

CREATE TABLE "PaymentAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "moveInChargeId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAllocation_amount_positive_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentAllocation_refund_bounds_check" CHECK (
    "refundedAmount" >= 0 AND "refundedAmount" <= "amount"
  )
);

CREATE UNIQUE INDEX "MoveInCharge_idempotencyKey_key"
  ON "MoveInCharge"("idempotencyKey");
CREATE UNIQUE INDEX "MoveInCharge_lastAdjustmentRequestId_key"
  ON "MoveInCharge"("lastAdjustmentRequestId");
CREATE UNIQUE INDEX "MoveInCharge_first_month_billing_key"
  ON "MoveInCharge"("leaseId", "billingPeriod")
  WHERE "category" = 'FIRST_MONTH_RENT'
    AND "billingPeriod" IS NOT NULL
    AND "status" <> 'VOID';
CREATE UNIQUE INDEX "MoveInCharge_security_deposit_lease_key"
  ON "MoveInCharge"("leaseId")
  WHERE "category" = 'SECURITY_DEPOSIT'
    AND "status" <> 'VOID';
CREATE INDEX "MoveInCharge_tenantId_status_dueDate_id_idx"
  ON "MoveInCharge"("tenantId", "status", "dueDate", "id");
CREATE INDEX "MoveInCharge_leaseId_status_dueDate_id_idx"
  ON "MoveInCharge"("leaseId", "status", "dueDate", "id");
CREATE INDEX "MoveInCharge_unitId_idx"
  ON "MoveInCharge"("unitId");
CREATE INDEX "MoveInCharge_propertyOwnerId_createdAt_id_idx"
  ON "MoveInCharge"("propertyOwnerId", "createdAt" DESC, "id" DESC);
CREATE INDEX "MoveInCharge_postedByUserId_idx"
  ON "MoveInCharge"("postedByUserId");
CREATE INDEX "MoveInCharge_adjustedByUserId_idx"
  ON "MoveInCharge"("adjustedByUserId");
CREATE INDEX "MoveInCharge_category_status_dueDate_idx"
  ON "MoveInCharge"("category", "status", "dueDate");

CREATE UNIQUE INDEX "PaymentAllocation_paymentId_moveInChargeId_key"
  ON "PaymentAllocation"("paymentId", "moveInChargeId");
CREATE INDEX "PaymentAllocation_moveInChargeId_createdAt_id_idx"
  ON "PaymentAllocation"("moveInChargeId", "createdAt" DESC, "id" DESC);

CREATE INDEX "Payment_purpose_paidAt_id_idx"
  ON "Payment"("purpose", "paidAt" DESC, "id" DESC);

ALTER TABLE "MoveInCharge"
  ADD CONSTRAINT "MoveInCharge_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInCharge_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "Lease"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInCharge_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInCharge_propertyOwnerId_fkey"
    FOREIGN KEY ("propertyOwnerId") REFERENCES "PropertyOwner"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInCharge_postedByUserId_fkey"
    FOREIGN KEY ("postedByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MoveInCharge_adjustedByUserId_fkey"
    FOREIGN KEY ("adjustedByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentAllocation"
  ADD CONSTRAINT "PaymentAllocation_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentAllocation_moveInChargeId_fkey"
    FOREIGN KEY ("moveInChargeId") REFERENCES "MoveInCharge"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoveInCharge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAllocation" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "MoveInCharge" FROM anon, authenticated;
REVOKE ALL ON TABLE "PaymentAllocation" FROM anon, authenticated;
