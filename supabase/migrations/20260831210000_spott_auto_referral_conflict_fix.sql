-- Bug fix, caught in live verification: attachSpottAutoReferral's
-- upsert(..., { onConflict: "referred_user_id" }) generates a plain
-- `ON CONFLICT (referred_user_id)` clause, which Postgres cannot match
-- against a PARTIAL unique index (the one added in
-- 20260830220700_spott_auto_referral_idempotency.sql) — a partial index
-- only satisfies an ON CONFLICT target that repeats its exact WHERE
-- predicate, which Supabase's upsert() helper has no way to express. Every
-- attach insert was silently failing with "insert_failed". Since every
-- current insert path already always sets referred_user_id (no code ever
-- inserts a null one), a plain NOT NULL + UNIQUE constraint is both
-- sufficient and simpler than trying to express the partial predicate.
DROP INDEX IF EXISTS public.idx_spott_auto_referrals_referred_user;

ALTER TABLE public.spott_auto_referrals
  ALTER COLUMN referred_user_id SET NOT NULL,
  ADD CONSTRAINT spott_auto_referrals_referred_user_id_key UNIQUE (referred_user_id);
