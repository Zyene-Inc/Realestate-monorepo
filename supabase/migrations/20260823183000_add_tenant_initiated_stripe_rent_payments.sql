CREATE TYPE "StripeCheckoutStatus" AS ENUM (
  'NOT_STARTED',
  'OPEN',
  'COMPLETE',
  'FAILED',
  'EXPIRED'
);

CREATE TYPE "StripeWebhookEventStatus" AS ENUM (
  'RECEIVED',
  'PROCESSED',
  'IGNORED',
  'FAILED'
);

ALTER TABLE "PropertyOwner"
  ADD COLUMN "stripeAccountLastSyncedAt" TIMESTAMP(3);

ALTER TABLE "Payment"
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "stripeCheckoutUrl" TEXT,
  ADD COLUMN "stripeCheckoutStatus" "StripeCheckoutStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "stripeCheckoutExpiresAt" TIMESTAMP(3),
  ADD COLUMN "stripeChargeId" TEXT,
  ADD COLUMN "stripeTransferId" TEXT,
  ADD COLUMN "stripePaymentMethodType" TEXT,
  ADD COLUMN "stripeLastEventAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key"
  ON "Payment"("stripeCheckoutSessionId")
  WHERE "stripeCheckoutSessionId" IS NOT NULL;
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key"
  ON "Payment"("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;
CREATE UNIQUE INDEX "Payment_stripeChargeId_key"
  ON "Payment"("stripeChargeId")
  WHERE "stripeChargeId" IS NOT NULL;
CREATE INDEX "Payment_stripeCheckoutStatus_stripeCheckoutExpiresAt_idx"
  ON "Payment"("stripeCheckoutStatus", "stripeCheckoutExpiresAt");

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT PRIMARY KEY,
  "stripeEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "status" "StripeWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "paymentId" TEXT,
  "payload" TEXT NOT NULL,
  "processingError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key"
  ON "StripeWebhookEvent"("stripeEventId");
CREATE INDEX "StripeWebhookEvent_type_createdAt_id_idx"
  ON "StripeWebhookEvent"("type", "createdAt" DESC, "id" DESC);
CREATE INDEX "StripeWebhookEvent_paymentId_createdAt_id_idx"
  ON "StripeWebhookEvent"("paymentId", "createdAt" DESC, "id" DESC);
CREATE INDEX "StripeWebhookEvent_status_createdAt_id_idx"
  ON "StripeWebhookEvent"("status", "createdAt" DESC, "id" DESC);

UPDATE "AutoPay" SET "enabled" = FALSE WHERE "enabled" = TRUE;
ALTER TABLE "AutoPay"
  ADD CONSTRAINT "AutoPay_manual_payment_only_check" CHECK ("enabled" = FALSE);

ALTER TABLE "StripeWebhookEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StripeWebhookEvent" FROM anon, authenticated;
