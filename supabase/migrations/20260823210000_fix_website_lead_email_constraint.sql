ALTER TABLE public."WebsiteLead"
  DROP CONSTRAINT IF EXISTS "WebsiteLead_email_format_check";

ALTER TABLE public."WebsiteLead"
  ADD CONSTRAINT "WebsiteLead_email_format_check"
  CHECK ("email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
