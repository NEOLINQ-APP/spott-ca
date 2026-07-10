SELECT cron.schedule(
  'spott-saved-search-alerts',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--27376090-70b8-4aa2-8796-409682e1b9c7.lovable.app/api/public/hooks/saved-search-alerts',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xcHBnbnVybGV2Zmp0bHVldHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzY2MDAsImV4cCI6MjA5NDgxMjYwMH0.yrg7PqxoSC-ZQDZqNvip53zXRZSuRWuOVZKmdr9dEDg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);