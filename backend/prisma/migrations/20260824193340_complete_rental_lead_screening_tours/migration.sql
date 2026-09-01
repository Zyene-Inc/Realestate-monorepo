ALTER TYPE public."WebsiteLeadStatus"
  ADD VALUE IF NOT EXISTS 'SCREENING';

ALTER TYPE public."WebsiteLeadStatus"
  ADD VALUE IF NOT EXISTS 'TOUR_SCHEDULED';

DO $$ BEGIN
  CREATE TYPE public."WebsiteLeadScreeningStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'QUALIFIED',
    'NOT_QUALIFIED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public."WebsiteLeadTourStatus" AS ENUM (
    'NOT_SCHEDULED',
    'SCHEDULED',
    'COMPLETED',
    'CANCELED',
    'NO_SHOW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public."WebsiteLead"
  ADD COLUMN IF NOT EXISTS "assignedToUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contactedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "screeningStatus" public."WebsiteLeadScreeningStatus"
    NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "screeningSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "screeningCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tourStatus" public."WebsiteLeadTourStatus"
    NOT NULL DEFAULT 'NOT_SCHEDULED',
  ADD COLUMN IF NOT EXISTS "tourScheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tourCompletedAt" TIMESTAMP(3);

ALTER TABLE public."WebsiteLead"
  DROP CONSTRAINT IF EXISTS "WebsiteLead_assignedToUserId_fkey",
  DROP CONSTRAINT IF EXISTS "WebsiteLead_assignment_consistency_check",
  DROP CONSTRAINT IF EXISTS "WebsiteLead_screening_summary_length_check",
  DROP CONSTRAINT IF EXISTS "WebsiteLead_tour_consistency_check";

ALTER TABLE public."WebsiteLead"
  ADD CONSTRAINT "WebsiteLead_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES public."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "WebsiteLead_assignment_consistency_check"
    CHECK (
      ("assignedToUserId" IS NULL AND "assignedAt" IS NULL)
      OR
      ("assignedToUserId" IS NOT NULL AND "assignedAt" IS NOT NULL)
    ),
  ADD CONSTRAINT "WebsiteLead_screening_summary_length_check"
    CHECK (
      "screeningSummary" IS NULL
      OR char_length("screeningSummary") BETWEEN 1 AND 4000
    ),
  ADD CONSTRAINT "WebsiteLead_tour_consistency_check"
    CHECK (
      ("tourStatus" = 'NOT_SCHEDULED' AND "tourScheduledAt" IS NULL)
      OR
      ("tourStatus" <> 'NOT_SCHEDULED' AND "tourScheduledAt" IS NOT NULL)
    );

CREATE TABLE public."WebsiteLeadNote" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteLeadNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteLeadNote_body_length_check"
    CHECK (char_length("body") BETWEEN 1 AND 4000),
  CONSTRAINT "WebsiteLeadNote_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES public."WebsiteLead"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WebsiteLeadNote_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES public."User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "WebsiteLead_assignedToUserId_status_updatedAt_id_idx"
  ON public."WebsiteLead"(
    "assignedToUserId",
    "status",
    "updatedAt" DESC,
    "id" DESC
  );

CREATE INDEX "WebsiteLead_screeningStatus_updatedAt_id_idx"
  ON public."WebsiteLead"("screeningStatus", "updatedAt" DESC, "id" DESC);

CREATE INDEX "WebsiteLead_tourStatus_tourScheduledAt_idx"
  ON public."WebsiteLead"("tourStatus", "tourScheduledAt");

CREATE INDEX "WebsiteLeadNote_leadId_createdAt_id_idx"
  ON public."WebsiteLeadNote"("leadId", "createdAt" DESC, "id" DESC);

CREATE INDEX "WebsiteLeadNote_authorUserId_idx"
  ON public."WebsiteLeadNote"("authorUserId");

ALTER TABLE public."WebsiteLeadNote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."WebsiteLeadNote" FROM anon, authenticated;

