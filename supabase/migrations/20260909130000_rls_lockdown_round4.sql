-- Round 4: extended the same INSERT-policy sweep (20260909120000) across
-- the full schema instead of just the two already-known tables, and found
-- 4 more real gaps.
--
-- promoters — INSERT ("Anyone authenticated can apply") already pins
-- status='pending' but nothing else; UPDATE ("Promoters update limited
-- fields") only pinned status. Grepped every real write site: the
-- application flow (promoters.functions.ts's applyAsPromoter) and the
-- self-edit flow (updateMyPromoterProfile) BOTH already use supabaseAdmin
-- with their own Zod-validated field whitelists — zero legitimate INSERT
-- or UPDATE via the regular client for contact/commission/stripe-connect
-- fields. The only regular-client writes left were stripe-connect.functions.ts's
-- two onboarding/sync updates (stripe_connect_account_id/status/
-- charges_enabled/payouts_enabled/details_submitted/last_synced_at) —
-- moved to supabaseAdmin in this same change (see stripe-connect.functions.ts),
-- since those values are legitimate (verified against Stripe's own API
-- response) but RLS has no way to tell that apart from a malicious client
-- claiming the same columns. With that moved, both policies can go
-- fully admin-only with zero regression — this also closes what would
-- otherwise have let an approved promoter self-set
-- stripe_connect_payouts_enabled=true (bypassing real Stripe verification
-- entirely) or self-inflate commission_value.
DROP POLICY "Anyone authenticated can apply" ON public.promoters;
CREATE POLICY "Anyone authenticated can apply" ON public.promoters FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Promoters update limited fields" ON public.promoters;
CREATE POLICY "Promoters update limited fields" ON public.promoters FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- marketplace_orders — "Buyers create own orders" only checked
-- buyer_id = auth.uid(), nothing else. createMarketplaceCheckout
-- (orders.functions.ts) — the one real checkout path — already uses
-- supabaseAdmin for the actual order insert, so this policy has zero
-- legitimate use via the regular client. Left open, it let a buyer
-- self-INSERT a fake "already paid" order (status='paid', paid_at=now(),
-- arbitrary total_cents/commission_cents) with no real Stripe payment
-- ever happening.
DROP POLICY "Buyers create own orders" ON public.marketplace_orders;
CREATE POLICY "Buyers create own orders" ON public.marketplace_orders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- promoter_payout_requests — "promoters create own payout requests" only
-- checked the promoter's own status='approved', not anything on the
-- payout request row itself. requestPayout() (stripe-connect.functions.ts)
-- IS a real, actively-used non-admin regular-client INSERT (it computes a
-- real available-balance cap server-side before inserting), so this can't
-- go admin-only — pinned to the real defaults requestPayout already sends
-- (status='requested', every stripe/approval/payout timestamp NULL)
-- instead. Left open before this, an approved promoter could self-INSERT
-- a payout request already marked status='paid' with a real
-- stripe_payout_id and paid_at, worth any amount.
DROP POLICY "promoters create own payout requests" ON public.promoter_payout_requests;
CREATE POLICY "promoters create own payout requests" ON public.promoter_payout_requests FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_payout_requests.promoter_id AND p.user_id = auth.uid() AND p.status = 'approved'::text)
      AND status = 'requested'::text
      AND stripe_transfer_id IS NULL
      AND stripe_payout_id IS NULL
      AND approved_at IS NULL
      AND paid_at IS NULL
      AND rejected_at IS NULL
      AND processed_by IS NULL
    )
  );

-- business_claims — "Authenticated users can submit a claim" checked the
-- claimant and that the target business is unclaimed, but not the claim
-- row's own status. claim.$slug.tsx's real insert never sets status/
-- reviewed_by/reviewed_at (relies on the column defaults), so pinning
-- them costs nothing. Left open before this, a claimant could self-INSERT
-- an already status='approved' claim, bypassing admin review entirely
-- (the actual businesses.is_claimed/owner_id transfer only happens via a
-- separate admin action today, so this wasn't yet a full account
-- takeover — but a self-approved claim sitting in the system is real,
-- exploitable bad data integrity worth closing regardless).
DROP POLICY "Authenticated users can submit a claim" ON public.business_claims;
CREATE POLICY "Authenticated users can submit a claim" ON public.business_claims FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      claimant_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_claims.business_id AND b.is_claimed = false)
      AND status = 'pending'::text
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
    )
  );
