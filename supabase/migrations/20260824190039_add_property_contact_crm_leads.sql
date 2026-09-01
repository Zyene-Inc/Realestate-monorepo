ALTER TYPE public."WebsiteLeadSource"
  ADD VALUE IF NOT EXISTS 'CONTACT_FORM';

DO $$ BEGIN
  CREATE TYPE public."WebsiteLeadIntent" AS ENUM (
    'GENERAL',
    'RENTAL_INQUIRY',
    'RENTAL_TOUR',
    'RENTAL_APPLICATION',
    'SIMILAR_RENTAL',
    'BUYER_INQUIRY',
    'SELLER_INQUIRY',
    'MARKET_REPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public."WebsiteLead"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "intent" public."WebsiteLeadIntent",
  ADD COLUMN IF NOT EXISTS "propertyId" TEXT,
  ADD COLUMN IF NOT EXISTS "unitId" TEXT,
  ADD COLUMN IF NOT EXISTS "moveInDate" DATE;

ALTER TABLE public."WebsiteLead"
  DROP CONSTRAINT IF EXISTS "WebsiteLead_name_length_check",
  DROP CONSTRAINT IF EXISTS "WebsiteLead_propertyId_fkey",
  DROP CONSTRAINT IF EXISTS "WebsiteLead_unitId_fkey";

ALTER TABLE public."WebsiteLead"
  ADD CONSTRAINT "WebsiteLead_name_length_check"
    CHECK ("name" IS NULL OR char_length("name") BETWEEN 2 AND 100),
  ADD CONSTRAINT "WebsiteLead_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES public."Property"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "WebsiteLead_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES public."Unit"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WebsiteLead_propertyId_createdAt_idx"
  ON public."WebsiteLead"("propertyId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "WebsiteLead_unitId_createdAt_idx"
  ON public."WebsiteLead"("unitId", "createdAt" DESC);
