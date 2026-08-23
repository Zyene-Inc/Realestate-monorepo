ALTER TABLE "EmailLog"
ADD COLUMN "templateKey" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "templateVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "resendEmailId" TEXT,
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "openedAt" TIMESTAMP(3),
ADD COLUMN "clickedAt" TIMESTAMP(3),
ADD COLUMN "bouncedAt" TIMESTAMP(3),
ADD COLUMN "complainedAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "suppressedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "EmailLog"
SET
  "status" = CASE WHEN lower("status") = 'sent' THEN 'SENT' ELSE upper("status") END,
  "idempotencyKey" = 'legacy/' || "id" || '/' || extract(epoch FROM "createdAt")::text,
  "sentAt" = CASE WHEN lower("status") = 'sent' THEN "createdAt" ELSE NULL END;

ALTER TABLE "EmailLog"
ALTER COLUMN "templateKey" DROP DEFAULT,
ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");
CREATE UNIQUE INDEX "EmailLog_resendEmailId_key" ON "EmailLog"("resendEmailId");
CREATE INDEX "EmailLog_status_nextRetryAt_idx" ON "EmailLog"("status", "nextRetryAt");
CREATE INDEX "EmailLog_createdAt_id_idx" ON "EmailLog"("createdAt" DESC, "id" DESC);

CREATE TABLE "EmailEvent" (
  "id" TEXT NOT NULL,
  "emailLogId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "providerCreatedAt" TIMESTAMP(3) NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailEvent_providerEventId_key" ON "EmailEvent"("providerEventId");
CREATE INDEX "EmailEvent_emailLogId_providerCreatedAt_idx" ON "EmailEvent"("emailLogId", "providerCreatedAt");

ALTER TABLE "EmailEvent"
ADD CONSTRAINT "EmailEvent_emailLogId_fkey"
FOREIGN KEY ("emailLogId") REFERENCES "EmailLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailEvent" ENABLE ROW LEVEL SECURITY;
