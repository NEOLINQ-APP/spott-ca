-- 1) Hide marketplace_listings.contact_email/contact_phone from anon/authenticated
REVOKE SELECT ON public.marketplace_listings FROM anon, authenticated;
GRANT SELECT (
  id, user_id, category_id, title, description, price_cents, currency,
  condition, listing_type, city, province, postal_code, latitude, longitude,
  status, view_count, created_at, updated_at, tags, commission_cents,
  compare_at_price_cents, is_featured, featured_until, is_boosted,
  boosted_until, boost_score
) ON public.marketplace_listings TO anon, authenticated;

-- 2) Hide profiles.contact_email/contact_phone from anon/authenticated
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, avatar_url, created_at, updated_at, referral_code,
  referred_by_code, status, username, bio, cover_url, location, contact_pref
) ON public.profiles TO anon, authenticated;

-- 3) marketplace_orders: allow sellers to view orders that contain their items
CREATE POLICY "Sellers view orders containing their items"
ON public.marketplace_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_order_items i
    WHERE i.order_id = marketplace_orders.id
      AND i.seller_id = auth.uid()
  )
);

-- 4) vehicle_photos: restrict SELECT to mirror vehicles access (active OR owner OR admin)
DROP POLICY IF EXISTS "Vehicle photos are public" ON public.vehicle_photos;

CREATE POLICY "Vehicle photos visible with parent vehicle"
ON public.vehicle_photos
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = vehicle_photos.vehicle_id
      AND (
        v.status = 'active'
        OR v.seller_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);