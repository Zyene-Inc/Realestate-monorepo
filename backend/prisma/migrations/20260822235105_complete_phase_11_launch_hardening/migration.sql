ALTER TABLE "ListingInquiry"
ADD COLUMN "buyerAccessTokenExpiresAt" TIMESTAMP(3);

UPDATE "ListingInquiry"
SET "buyerAccessTokenExpiresAt" = GREATEST("createdAt", "updatedAt") + INTERVAL '30 days'
WHERE "buyerAccessTokenExpiresAt" IS NULL;

ALTER TABLE "ListingInquiry"
ALTER COLUMN "buyerAccessTokenExpiresAt" SET NOT NULL;

ALTER TABLE "Payment"
ADD COLUMN "idempotencyKey" UUID,
ADD COLUMN "recordRequestFingerprint" VARCHAR(64),
ADD COLUMN "lastStatusRequestId" UUID;

ALTER TABLE "SaleCommission"
ADD COLUMN "requestFingerprint" VARCHAR(64);

UPDATE "Payment"
SET "idempotencyKey" = gen_random_uuid()
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "Payment"
ALTER COLUMN "idempotencyKey" SET NOT NULL,
ALTER COLUMN "idempotencyKey" SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "Payment_referenceNumber_key" ON "Payment"("referenceNumber");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_lastStatusRequestId_key" ON "Payment"("lastStatusRequestId");
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");
CREATE INDEX "Payment_leaseId_idx" ON "Payment"("leaseId");
CREATE INDEX "Payment_unitId_idx" ON "Payment"("unitId");
