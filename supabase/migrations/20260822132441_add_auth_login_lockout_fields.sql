alter table public."User"
  add column if not exists "failedLoginAttempts" integer not null default 0,
  add column if not exists "lastFailedLoginAt" timestamp(3),
  add column if not exists "lockedUntil" timestamp(3);
