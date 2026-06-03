-- 1) business_referrals: allow referred business owner / claimant to read their own referral row
DROP POLICY IF EXISTS "Referrer or admin views referrals" ON public.business_referrals;
CREATE POLICY "Referrer, referred or admin views referrals"
ON public.business_referrals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_referrals.referrer_business_id
      AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_referrals.referred_business_id
      AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.business_claims c
    WHERE c.id = business_referrals.referred_claim_id
      AND c.claimant_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) marketplace_listings: hide seller PII columns from anonymous visitors.
REVOKE SELECT (contact_email, contact_phone) ON public.marketplace_listings FROM anon;

-- 3) marketplace_orders: allow sellers to read orders containing their own items
DROP POLICY IF EXISTS "Sellers view orders for their items" ON public.marketplace_orders;
CREATE POLICY "Sellers view orders for their items"
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