-- This event-trigger helper is invoked by Postgres, not by the Data API.
-- Remove default function execution rights from public-facing roles.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
