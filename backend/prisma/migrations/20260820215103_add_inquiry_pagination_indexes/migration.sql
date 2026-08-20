CREATE INDEX IF NOT EXISTS "ListingInquiry_agentId_lastMessageAt_idx"
ON "ListingInquiry"("agentId", "lastMessageAt" DESC);

CREATE INDEX IF NOT EXISTS "ListingInquiry_lastMessageAt_idx"
ON "ListingInquiry"("lastMessageAt" DESC);
