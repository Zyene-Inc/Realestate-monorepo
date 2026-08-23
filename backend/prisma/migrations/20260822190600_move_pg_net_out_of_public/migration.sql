-- Keep the HTTP extension out of the exposed public schema. Its API remains in
-- the extension-owned `net` schema, so the existing cron command is unchanged.
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
