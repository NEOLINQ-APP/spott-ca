
-- Marketplace listings: hide contact PII from anon/authenticated SELECTs
REVOKE SELECT (contact_email, contact_phone) ON public.marketplace_listings FROM anon, authenticated;

-- Marketplace orders: hide contact + shipping PII from anon/authenticated SELECTs
REVOKE SELECT (contact_email, contact_phone, shipping_address) ON public.marketplace_orders FROM anon, authenticated;

-- User follows: restrict visibility to authenticated users only
DROP POLICY IF EXISTS "Follows viewable by all" ON public.user_follows;
CREATE POLICY "Follows viewable by authenticated"
ON public.user_follows
FOR SELECT
TO authenticated
USING (true);

-- business-photos bucket: add explicit public SELECT policy on storage.objects
DROP POLICY IF EXISTS "Public read business-photos" ON storage.objects;
CREATE POLICY "Public read business-photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-photos');
