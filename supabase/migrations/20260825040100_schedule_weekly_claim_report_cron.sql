-- Weekly (not daily) sent/opened/claimed/bounced summary email for the
-- claim-listing campaign, matching the explicitly agreed "don't spam"
-- reporting cadence. Monday 9am Mountain (UTC-6 in August/MDT) = 15:00 UTC.
SELECT cron.schedule(
  'spott-weekly-claim-report',
  '0 15 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://www.spott.ca/api/public/cron/weekly-claim-report',
    headers := '{"Content-Type":"application/json","x-cron-secret":"1dc7b8062fff940bf37296894d6b71b46e83c9c80de66678721ada740bf38738"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
