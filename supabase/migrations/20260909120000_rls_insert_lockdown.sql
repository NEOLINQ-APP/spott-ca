-- Round 3: the UPDATE-side fixes (20260909100000/110000) missed that the
-- exact same fields are also exposed on INSERT — a fresh row never has a
-- "prior value" to pin against, so a malicious direct INSERT could just
-- set claim_status='verified'/is_featured=true/etc. from creation, no
-- pre-existing row needed at all. Confirmed live: a disposable test user
-- successfully POSTed a brand-new business with claim_status='verified',
-- is_claimed=true, dealer_verified=true, featured_tier='premium' in one
-- request (201, no errors) before this fix.
--
-- businesses — grepped every non-admin .from("businesses").insert() call
-- site in the app: there are none. Business signup today only ever
-- creates a business_verification_requests row (a claim on an
-- OSM-imported listing); there is no in-app "create a new business"
-- flow at all. The existing INSERT policy (any authenticated user, forced
-- status='pending') is therefore pure exposure with zero legitimate use
-- today — but rather than remove the capability outright (status='pending'
-- reads like deliberate prep for a not-yet-shipped self-serve listing
-- flow), pin every paid/trust column to its real column default so that
-- if/when that flow ships, a submitted business still starts genuinely
-- unclaimed and unfeatured rather than reopening this hole.
DROP POLICY "Authenticated users can create businesses" ON public.businesses;
CREATE POLICY "Authenticated users can create businesses" ON public.businesses FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      auth.uid() IS NOT NULL
      AND status = 'pending'::business_status
      AND claim_status = 'unclaimed'
      AND is_claimed = false
      AND dealer_verified = false
      AND dealer_verified_at IS NULL
      AND featured_tier IS NULL
      AND featured_until IS NULL
      AND featured_priority = 0
      AND featured_sections = '{}'::text[]
      AND featured_highlights_until IS NULL
      AND bumped_until IS NULL
      AND extra_tags_until IS NULL
      AND photo_pack_bonus = 0
    )
  );

-- vehicles — createVehicle() (vehicles.functions.ts) is the one real,
-- actively-used non-admin INSERT path, via the regular client. Its own
-- Zod schema never includes is_featured/is_boosted/boosted_until/
-- boost_score/featured_until/view_count/odometer_status/prior_use/
-- damage_amount_cents/carfax_url/compliance_flags, so it can never send
-- them — but that's an app-level filter a direct REST call bypasses
-- entirely, which is exactly how the live exploit above also worked
-- against vehicles (is_featured/is_boosted/boost_score all landed as
-- sent). Pinned to real column defaults below. accident_history/
-- clean_title/rebuilt_status/disclosure_signed_at/disclosure_signed_by
-- stay open — createVehicle legitimately sets all of these at the moment
-- the seller signs the disclosure attestation, so pinning them would
-- break real listing creation.
--
-- Also closes a second, separate real gap found while building this:
-- dealer_business_id had no ownership check at all on INSERT, meaning any
-- seller could link their own vehicle to a real dealership they don't
-- own, impersonating that dealer's inventory. Now mirrors the same
-- ownership check createVehicle already performs server-side, as a real
-- DB-level guarantee rather than only an app-level one.
DROP POLICY "Users can create their own vehicle listings" ON public.vehicles;
CREATE POLICY "Users can create their own vehicle listings" ON public.vehicles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      auth.uid() = seller_id
      AND is_featured = false
      AND is_boosted = false
      AND boosted_until IS NULL
      AND boost_score = 0
      AND featured_until IS NULL
      AND view_count = 0
      AND odometer_status = 'accurate'
      AND prior_use = 'personal'
      AND damage_amount_cents IS NULL
      AND carfax_url IS NULL
      AND compliance_flags = '{}'::text[]
      AND (
        dealer_business_id IS NULL
        OR dealer_business_id IN (
          SELECT b.id FROM public.businesses b
          WHERE b.owner_id = auth.uid() AND b.status = 'approved' AND b.business_type = 'dealership'
        )
      )
    )
  );
