
-- Revoke column-level UPDATE on privileged monetization fields from the
-- authenticated role so direct PostgREST writes cannot bypass the
-- server-side allowlists. Reads remain unchanged. Service role keeps
-- full access; admin/server flows continue to mutate these via the
-- supabaseAdmin client.

-- businesses: featured / boost / placement columns
REVOKE UPDATE (
  featured_until,
  featured_tier,
  bumped_until,
  featured_priority,
  featured_sections,
  photo_pack_bonus,
  extra_tags_until
) ON public.businesses FROM authenticated, anon;

-- marketplace_listings: featured / boost columns
REVOKE UPDATE (
  is_featured,
  featured_until,
  is_boosted,
  boosted_until,
  boost_score
) ON public.marketplace_listings FROM authenticated, anon;

-- vehicles: featured / boost / view_count / dealer linkage
REVOKE UPDATE (
  is_featured,
  featured_until,
  is_boosted,
  boosted_until,
  boost_score,
  view_count,
  dealer_business_id
) ON public.vehicles FROM authenticated, anon;

-- Ensure service_role retains full UPDATE for server-side flows.
GRANT UPDATE ON public.businesses TO service_role;
GRANT UPDATE ON public.marketplace_listings TO service_role;
GRANT UPDATE ON public.vehicles TO service_role;
