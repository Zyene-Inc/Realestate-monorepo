ALTER TABLE "WebsiteLead"
  DROP CONSTRAINT IF EXISTS "WebsiteLead_email_format_check";

ALTER TABLE "WebsiteLead"
  ADD CONSTRAINT "WebsiteLead_email_format_check"
  CHECK ("email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
