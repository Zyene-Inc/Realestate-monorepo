DO $$ BEGIN
  CREATE TYPE "WebsiteLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WebsiteLeadSource" AS ENUM ('CHATBOT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WebsiteLead" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "message" TEXT NOT NULL,
  "source" "WebsiteLeadSource" NOT NULL DEFAULT 'CHATBOT',
  "status" "WebsiteLeadStatus" NOT NULL DEFAULT 'NEW',
  "conversationId" TEXT,
  "visitorDayHash" CHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteLead_email_format_check"
    CHECK ("email" ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'),
  CONSTRAINT "WebsiteLead_message_length_check"
    CHECK (char_length("message") BETWEEN 5 AND 4000),
  CONSTRAINT "WebsiteLead_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WebsiteLead_status_createdAt_idx"
  ON "WebsiteLead"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WebsiteLead_email_idx"
  ON "WebsiteLead"("email");

ALTER TABLE "WebsiteLead" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteLead" FROM anon, authenticated;
