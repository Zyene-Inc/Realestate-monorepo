ALTER TABLE "Payment"
  ADD COLUMN "propertyOwnerId" TEXT,
  ADD COLUMN "ownerCommissionRate" DECIMAL(5,2),
  ADD COLUMN "managementCommissionAmount" DECIMAL(12,2),
  ADD COLUMN "ownerProceedsAmount" DECIMAL(12,2);

UPDATE "Payment" AS payment
SET
  "propertyOwnerId" = property."ownerId",
  "ownerCommissionRate" = owner."commissionRate",
  "managementCommissionAmount" = ROUND(
    CAST(payment."paidAmount" AS NUMERIC) * owner."commissionRate" / 100,
    2
  ),
  "ownerProceedsAmount" = ROUND(
    CAST(payment."paidAmount" AS NUMERIC) -
      (CAST(payment."paidAmount" AS NUMERIC) * owner."commissionRate" / 100),
    2
  )
FROM "Unit" AS unit
JOIN "Property" AS property ON property."id" = unit."propertyId"
JOIN "PropertyOwner" AS owner ON owner."id" = property."ownerId"
WHERE payment."unitId" = unit."id";

-- Legacy partial receipts did not receive a paidAt timestamp. updatedAt is the
-- closest durable receipt timestamp available for those existing rows.
UPDATE "Payment"
SET "paidAt" = "updatedAt"
WHERE "status" = 'PARTIAL'
  AND "paidAmount" > 0
  AND "paidAt" IS NULL;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_propertyOwnerId_fkey"
    FOREIGN KEY ("propertyOwnerId") REFERENCES "PropertyOwner"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_owner_commission_rate_range"
    CHECK ("ownerCommissionRate" IS NULL OR ("ownerCommissionRate" >= 0 AND "ownerCommissionRate" <= 100)),
  ADD CONSTRAINT "Payment_management_commission_nonnegative"
    CHECK ("managementCommissionAmount" IS NULL OR "managementCommissionAmount" >= 0),
  ADD CONSTRAINT "Payment_owner_proceeds_nonnegative"
    CHECK ("ownerProceedsAmount" IS NULL OR "ownerProceedsAmount" >= 0);

CREATE INDEX "Payment_propertyOwnerId_paidAt_id_idx"
  ON "Payment"("propertyOwnerId", "paidAt" DESC, "id" DESC);
CREATE INDEX "Payment_status_paidAt_id_idx"
  ON "Payment"("status", "paidAt" DESC, "id" DESC);
CREATE INDEX "AuditLog_createdAt_id_idx"
  ON "AuditLog"("createdAt" DESC, "id" DESC);
CREATE INDEX "AuditLog_userId_createdAt_id_idx"
  ON "AuditLog"("userId", "createdAt" DESC, "id" DESC);
CREATE INDEX "AuditLog_resource_createdAt_id_idx"
  ON "AuditLog"("resource", "createdAt" DESC, "id" DESC);
CREATE INDEX "AuditLog_action_createdAt_id_idx"
  ON "AuditLog"("action", "createdAt" DESC, "id" DESC);
