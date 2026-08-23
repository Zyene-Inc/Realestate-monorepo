CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'retry-critical-email-delivery',
  '*/10 * * * *',
  $$
    SELECT net.http_get(
      url := 'https://coach-johnson-realty-api-nu.vercel.app/api/internal/emails/retry',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'email_retry_cron_secret'
        )
      ),
      timeout_milliseconds := 10000
    ) AS request_id;
  $$
);
