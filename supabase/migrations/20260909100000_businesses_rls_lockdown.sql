-- Real vulnerability found 2026-09-09 (same class as a live exploit found
-- and fixed on muviis — see memory supabase_rls_column_level_writes.md):
-- businesses has a table-level UPDATE grant to `authenticated` (needed so
-- owners can edit their own listing), and its RLS WITH CHECK only pinned
-- owner_id/status for non-admins. Every other column was self-writable by
-- any business owner via a direct REST PATCH to their own row — including
-- verification/trust flags (claim_status, is_claimed, dealer_verified,
-- dealer_verified_at) and paid-entitlement flags that should only ever be
-- set by a Stripe webhook, a redeemed coupon, or an admin action
-- (featured_tier, featured_until, featured_priority, featured_sections,
-- featured_highlights_until, bumped_until, extra_tags_until,
-- photo_pack_bonus). A business owner could grant themselves the verified
-- badge or every paid placement feature for free, with zero errors,
-- entirely invisible from reading the app's own code (the app's UI/actions
-- never expose this — it only shows up by calling the database API
-- directly).
--
-- Fix extends the existing WITH CHECK (not a column-level REVOKE — per the
-- muviis finding, that's a no-op while the table-level GRANT remains) to
-- pin every one of these columns to their prior value for any non-admin
-- update, verified against every real non-admin, non-service-role
-- `.update()` call site in the app (dashboard.tsx's AdminPanel writes
-- status/is_claimed via the *admin* branch already; every other write to
-- these columns goes through supabaseAdmin — service role, unaffected by
-- RLS either way). Uses ROW(...) IS NOT DISTINCT FROM ... rather than `=`
-- since most of these columns are nullable and `NULL = NULL` is NULL (a
-- silent, incorrect rejection), not TRUE.

DROP POLICY "Owners and admins update businesses" ON public.businesses;

CREATE POLICY "Owners and admins update businesses" ON public.businesses FOR UPDATE
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      auth.uid() = owner_id
      AND ROW(
        owner_id, status, claim_status, is_claimed, dealer_verified, dealer_verified_at,
        featured_tier, featured_until, featured_priority, featured_sections,
        featured_highlights_until, bumped_until, extra_tags_until, photo_pack_bonus
      ) IS NOT DISTINCT FROM (
        SELECT ROW(
          b.owner_id, b.status, b.claim_status, b.is_claimed, b.dealer_verified, b.dealer_verified_at,
          b.featured_tier, b.featured_until, b.featured_priority, b.featured_sections,
          b.featured_highlights_until, b.bumped_until, b.extra_tags_until, b.photo_pack_bonus
        )
        FROM public.businesses b WHERE b.id = businesses.id
      )
    )
  );
