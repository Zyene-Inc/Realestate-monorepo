create index if not exists "ListingInquiry_agentId_lastMessageAt_idx"
  on public."ListingInquiry" ("agentId", "lastMessageAt" desc);

create index if not exists "ListingInquiry_lastMessageAt_idx"
  on public."ListingInquiry" ("lastMessageAt" desc);
