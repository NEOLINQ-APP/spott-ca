-- One attributed referral per referred user (first-touch wins), enforced at
-- the DB level so the post-auth attach function can use a plain upsert with
-- onConflict — same idempotency pattern user_referrals already relies on via
-- profiles.referred_by_code + its own unique referred_user_id.
CREATE UNIQUE INDEX idx_spott_auto_referrals_referred_user
  ON public.spott_auto_referrals (referred_user_id)
  WHERE referred_user_id IS NOT NULL;
