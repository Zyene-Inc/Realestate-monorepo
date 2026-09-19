-- Complete generic tenant documents, announcement acknowledgements, and the in-app notification center.

CREATE TYPE "AnnouncementAudience" AS ENUM ('TENANT', 'AGENT');

ALTER TABLE "Announcement"
  ADD COLUMN "audience" "AnnouncementAudience" NOT NULL DEFAULT 'TENANT',
  ADD COLUMN "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Document"
  ADD COLUMN "uploadedByUserId" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN "href" TEXT,
  ADD COLUMN "readAt" TIMESTAMP(3);

CREATE TABLE "AnnouncementAcknowledgement" (
  "announcementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnnouncementAcknowledgement_pkey" PRIMARY KEY ("announcementId", "userId")
);

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnnouncementAcknowledgement"
  ADD CONSTRAINT "AnnouncementAcknowledgement_announcementId_fkey"
  FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementAcknowledgement"
  ADD CONSTRAINT "AnnouncementAcknowledgement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Announcement_audience_createdAt_id_idx"
  ON "Announcement"("audience", "createdAt" DESC, "id" DESC);
CREATE INDEX "Document_uploadedByUserId_idx" ON "Document"("uploadedByUserId");
CREATE INDEX "Notification_userId_isRead_createdAt_id_idx"
  ON "Notification"("userId", "isRead", "createdAt" DESC, "id" DESC);
CREATE INDEX "AnnouncementAcknowledgement_userId_acknowledgedAt_idx"
  ON "AnnouncementAcknowledgement"("userId", "acknowledgedAt" DESC);

ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnnouncementAcknowledgement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Announcement", "Document", "Notification", "AnnouncementAcknowledgement" FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Service role manages tenant documents" ON storage.objects;
CREATE POLICY "Service role manages tenant documents"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'tenant-documents')
WITH CHECK (bucket_id = 'tenant-documents');
