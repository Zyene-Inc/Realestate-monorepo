CREATE TYPE "OwnerExpenseCategory" AS ENUM ('MAINTENANCE');
CREATE TYPE "OwnerExpenseEntryType" AS ENUM ('CHARGE', 'ADJUSTMENT');

ALTER TABLE "MaintenanceRequest"
  ALTER COLUMN "cost" TYPE DECIMAL(12, 2)
    USING CASE
      WHEN "cost" IS NULL THEN NULL
      ELSE ROUND("cost"::numeric, 2)
    END,
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "MaintenanceRequest"
SET "completedAt" = "updatedAt"
WHERE "status" IN ('completed', 'tenant_confirmed')
  AND "completedAt" IS NULL;

CREATE TABLE "OwnerExpenseLedgerEntry" (
  "id" TEXT NOT NULL,
  "propertyOwnerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "unitId" TEXT,
  "maintenanceRequestId" TEXT NOT NULL,
  "vendorId" TEXT,
  "category" "OwnerExpenseCategory" NOT NULL DEFAULT 'MAINTENANCE',
  "entryType" "OwnerExpenseEntryType" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "postedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerExpenseLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OwnerExpenseLedgerEntry_nonzero_amount_check"
    CHECK ("amount" <> 0)
);

CREATE INDEX "OwnerExpenseLedgerEntry_propertyOwnerId_occurredAt_id_idx"
  ON "OwnerExpenseLedgerEntry"("propertyOwnerId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "OwnerExpenseLedgerEntry_propertyId_occurredAt_id_idx"
  ON "OwnerExpenseLedgerEntry"("propertyId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "OwnerExpenseLedgerEntry_maintenanceRequestId_createdAt_id_idx"
  ON "OwnerExpenseLedgerEntry"("maintenanceRequestId", "createdAt", "id");
CREATE INDEX "OwnerExpenseLedgerEntry_unitId_idx"
  ON "OwnerExpenseLedgerEntry"("unitId");
CREATE INDEX "OwnerExpenseLedgerEntry_vendorId_idx"
  ON "OwnerExpenseLedgerEntry"("vendorId");
CREATE INDEX "OwnerExpenseLedgerEntry_postedByUserId_idx"
  ON "OwnerExpenseLedgerEntry"("postedByUserId");

ALTER TABLE "OwnerExpenseLedgerEntry"
  ADD CONSTRAINT "OwnerExpenseLedgerEntry_propertyOwnerId_fkey"
    FOREIGN KEY ("propertyOwnerId") REFERENCES "PropertyOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OwnerExpenseLedgerEntry_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OwnerExpenseLedgerEntry_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OwnerExpenseLedgerEntry_maintenanceRequestId_fkey"
    FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "OwnerExpenseLedgerEntry_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "OwnerExpenseLedgerEntry_postedByUserId_fkey"
    FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OwnerExpenseLedgerEntry" (
  "id",
  "propertyOwnerId",
  "propertyId",
  "unitId",
  "maintenanceRequestId",
  "vendorId",
  "entryType",
  "amount",
  "description",
  "occurredAt"
)
SELECT
  'maint-expense-' || md5(request."id"),
  property."ownerId",
  request."propertyId",
  request."unitId",
  request."id",
  request."assignedVendorId",
  'CHARGE'::"OwnerExpenseEntryType",
  request."cost",
  'Maintenance cost: ' || request."category",
  COALESCE(request."completedAt", request."updatedAt")
FROM "MaintenanceRequest" request
JOIN "Property" property ON property."id" = request."propertyId"
WHERE request."status" IN ('completed', 'tenant_confirmed')
  AND request."cost" > 0
  AND property."ownerId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "OwnerExpenseLedgerEntry" entry
    WHERE entry."maintenanceRequestId" = request."id"
  );

ALTER TABLE "OwnerExpenseLedgerEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "OwnerExpenseLedgerEntry" FROM anon, authenticated;
