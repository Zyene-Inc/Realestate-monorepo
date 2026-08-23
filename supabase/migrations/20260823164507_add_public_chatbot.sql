CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "ChatConversation" (
  "id" TEXT PRIMARY KEY,
  "accessTokenHash" CHAR(64) NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatConversation_accessTokenHash_format_check"
    CHECK ("accessTokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ChatConversation_expiry_check"
    CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "role" "ChatMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "visitorDayHash" CHAR(64),
  "model" TEXT,
  "finishReason" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_content_length_check"
    CHECK (char_length("content") BETWEEN 1 AND 8000),
  CONSTRAINT "ChatMessage_role_metadata_check"
    CHECK (
      ("role" = 'USER' AND "visitorDayHash" IS NOT NULL AND "model" IS NULL)
      OR
      ("role" = 'ASSISTANT' AND "visitorDayHash" IS NULL AND "model" IS NOT NULL)
    ),
  CONSTRAINT "ChatMessage_token_counts_check"
    CHECK (
      ("inputTokens" IS NULL OR "inputTokens" >= 0)
      AND ("outputTokens" IS NULL OR "outputTokens" >= 0)
    ),
  CONSTRAINT "ChatMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ChatConversation_accessTokenHash_key"
  ON "ChatConversation"("accessTokenHash");
CREATE INDEX "ChatConversation_expiresAt_idx"
  ON "ChatConversation"("expiresAt");
CREATE INDEX "ChatConversation_lastMessageAt_id_idx"
  ON "ChatConversation"("lastMessageAt" DESC, "id" DESC);
CREATE INDEX "ChatMessage_conversationId_createdAt_id_idx"
  ON "ChatMessage"("conversationId", "createdAt" DESC, "id" DESC);
CREATE INDEX "ChatMessage_visitorDayHash_createdAt_idx"
  ON "ChatMessage"("visitorDayHash", "createdAt");
CREATE INDEX "ChatMessage_role_createdAt_idx"
  ON "ChatMessage"("role", "createdAt");

ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ChatConversation" FROM anon, authenticated;
REVOKE ALL ON TABLE "ChatMessage" FROM anon, authenticated;

SELECT cron.schedule(
  'delete-expired-public-chatbot-conversations',
  '17 3 * * *',
  $$DELETE FROM "ChatConversation" WHERE "expiresAt" < CURRENT_TIMESTAMP$$
);
