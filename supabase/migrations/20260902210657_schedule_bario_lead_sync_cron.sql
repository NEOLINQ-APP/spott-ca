-- Schedules the Bario lead-sync worker (src/routes/lovable/bario/lead-sync/process.ts)
-- to actually run. Every 5 minutes -- financing leads are time-sensitive
-- (a customer expects a response), so this runs more often than the
-- 10-minute ingest tick. Reuses the same x-cron-secret value already live
-- in production for the other cron-triggered routes (see
-- 20260825040000_schedule_claim_campaign_cron.sql) -- this is the real
-- CRON_SECRET env var value, not a placeholder.
SELECT cron.schedule(
  'spott-bario-lead-sync',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.spott.ca/lovable/bario/lead-sync/process',
    headers := '{"Content-Type":"application/json","x-cron-secret":"1dc7b8062fff940bf37296894d6b71b46e83c9c80de66678721ada740bf38738"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
