ALTER TABLE "EmailLog" ADD COLUMN "providerIdempotencyKey" TEXT;
UPDATE "EmailLog" SET "providerIdempotencyKey" = "idempotencyKey";
ALTER TABLE "EmailLog" ALTER COLUMN "providerIdempotencyKey" SET NOT NULL;
