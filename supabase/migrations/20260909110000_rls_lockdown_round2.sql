-- Continuation of the businesses RLS lockdown (20260909100000) after a
-- full-schema sweep for the same vulnerability class: a permissive
-- self-row UPDATE policy combined with a table-level GRANT and no WITH
-- CHECK column protection. Verified every table below against real
-- .update() call sites in the app (grep, not guesswork) before deciding
-- what's safe to lock down.
--
-- user_referrals — MOST SEVERE finding in this sweep. "Referrer can update
-- reward application" had USING and WITH CHECK both just
-- `auth.uid() = referrer_user_id`, no column restriction at all. A
-- referrer could self-PATCH their own row to status='qualified', then
-- call the real redeemReferralReward() server function (referrals.functions.ts)
-- to grant themselves 30 days of free Featured placement on a business or
-- marketplace listing they own — direct, repeatable reward fraud, zero
-- errors. The only legitimate way status ever reaches 'qualified' is the
-- SECURITY DEFINER trigger qualify_user_referral_on_listing() (confirmed
-- prosecdef=true, so it's unaffected by this lockdown — it bypasses RLS
-- for the referred user regardless). Every other write to this table goes
-- through supabaseAdmin. Zero legitimate non-admin direct write exists, so
-- the fix is a full admin-only WITH CHECK.
DROP POLICY "Referrer can update reward application" ON public.user_referrals;
CREATE POLICY "Referrer can update reward application" ON public.user_referrals FOR UPDATE
  USING (auth.uid() = referrer_user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- vehicles — "Users can update their own vehicle listings" had CHECK: null.
-- Grepped every .update() call site: the only one is a supabaseAdmin
-- view_count increment (vehicles.functions.ts) — there is no edit-listing
-- feature at all today, so zero legitimate non-admin direct write exists.
-- Left open, this let any seller self-grant is_featured/is_boosted/
-- boosted_until/boost_score/featured_until (paid placement, same pattern
-- as businesses) AND rewrite legally-significant used-vehicle disclosure
-- fields after the fact (clean_title, rebuilt_status, accident_history,
-- disclosure_signed_at/by, compliance_flags, odometer_status, prior_use,
-- damage_amount_cents) — a real fraud/liability vector on a Canadian
-- used-vehicle marketplace, not just a cosmetic one.
DROP POLICY "Users can update their own vehicle listings" ON public.vehicles;
CREATE POLICY "Users can update their own vehicle listings" ON public.vehicles FOR UPDATE
  USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- sparq_workspaces — "Owners manage their workspaces" had CHECK matching
-- USING with zero column pinning, exposing plan_tier/trial_ends_at/
-- monthly_message_limit/messages_this_month/status to self-escalation
-- (upgrade your own plan, extend your own trial, raise your own quota).
-- Grepped every .from("sparq_workspaces") call site in the app: there are
-- none — this table is entirely dead code today (an earlier, apparently
-- shelved Sparq embed-widget product). No live rows, no live risk right
-- now, but locking it down costs nothing and removes the exposure before
-- any future feature resurrects this table without re-auditing RLS.
DROP POLICY "Owners manage their workspaces" ON public.sparq_workspaces;
CREATE POLICY "Owners manage their workspaces" ON public.sparq_workspaces FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- profiles — "Users can update own profile" had CHECK: null, the exact
-- shape of the muviis incident. Confirmed roles genuinely live in
-- user_roles, never on profiles (per this project's own CLAUDE.md), so no
-- role field exists here to hijack. The one real risk column is `status`
-- (account status — unused by any app code today, but the exact same
-- self-reactivation/ban-bypass shape as the muviis bug, so worth freezing
-- preventively rather than waiting for a future suspension feature to
-- silently inherit this hole). display_name/avatar_url/bio/cover_url/
-- location/contact_email/contact_phone/contact_pref/username are all
-- confirmed legitimately self-editable (real settings-page writes) and
-- stay open. referred_by_code is separately writable by the user's own
-- signup-attribution call, but doesn't itself grant any reward (the actual
-- payable record lives in user_referrals, fixed above, via its own
-- SECURITY DEFINER trigger) — left alone rather than re-litigating that
-- function's idempotency guard in this pass.
DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND status = (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id)
  );
