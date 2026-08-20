create type "InquiryStatus" as enum ('OPEN', 'CLOSED');
create type "InquirySenderType" as enum ('BUYER', 'AGENT');

create table "ListingInquiry" (
  "id" text primary key,
  "propertyId" text not null,
  "agentId" text not null,
  "buyerName" text not null,
  "buyerEmail" text not null,
  "buyerPhone" text,
  "buyerAccessTokenHash" text not null,
  "status" "InquiryStatus" not null default 'OPEN',
  "agentLastReadAt" timestamp(3),
  "lastMessageAt" timestamp(3) not null default current_timestamp,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null,
  constraint "ListingInquiry_propertyId_fkey"
    foreign key ("propertyId") references "Property"("id") on delete cascade on update cascade,
  constraint "ListingInquiry_agentId_fkey"
    foreign key ("agentId") references "Agent"("id") on delete restrict on update cascade
);

create table "ListingInquiryMessage" (
  "id" text primary key,
  "inquiryId" text not null,
  "senderType" "InquirySenderType" not null,
  "body" text not null,
  "readAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  constraint "ListingInquiryMessage_inquiryId_fkey"
    foreign key ("inquiryId") references "ListingInquiry"("id") on delete cascade on update cascade
);

create unique index "ListingInquiry_buyerAccessTokenHash_key"
  on "ListingInquiry"("buyerAccessTokenHash");
create index "ListingInquiry_agentId_status_lastMessageAt_idx"
  on "ListingInquiry"("agentId", "status", "lastMessageAt");
create index "ListingInquiry_propertyId_lastMessageAt_idx"
  on "ListingInquiry"("propertyId", "lastMessageAt");
create index "ListingInquiryMessage_inquiryId_createdAt_idx"
  on "ListingInquiryMessage"("inquiryId", "createdAt");

alter table "ListingInquiry" enable row level security;
alter table "ListingInquiryMessage" enable row level security;
revoke all on table "ListingInquiry" from anon, authenticated;
revoke all on table "ListingInquiryMessage" from anon, authenticated;
