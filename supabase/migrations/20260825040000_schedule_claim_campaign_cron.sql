-- Schedules the already-built claim-invitation campaign
-- (src/routes/api/public/cron/claim-campaign.ts -> runClaimCampaign() in
-- src/lib/claim-invitations.server.ts) to actually run. The engine itself
-- was fully built (4-step 0/3/7/14-day drip, suppression/unsubscribe
-- handling) but nothing ever triggered it -- the only prior cron.schedule
-- entry in this repo (spott-saved-search-alerts) is for a different job
-- and points at an old Lovable-hosted URL, not spott.ca's real Vercel
-- deployment. Every 6 hours, not daily -- runClaimCampaign() only ever
-- sends what's actually due that run, so more frequent checks just mean
-- less delay on a due step, not more emails sent overall.
SELECT cron.schedule(
  'spott-claim-campaign',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.spott.ca/api/public/cron/claim-campaign',
    headers := '{"Content-Type":"application/json","x-cron-secret":"1dc7b8062fff940bf37296894d6b71b46e83c9c80de66678721ada740bf38738"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
