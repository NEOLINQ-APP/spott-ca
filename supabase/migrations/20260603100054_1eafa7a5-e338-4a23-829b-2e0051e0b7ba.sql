
-- 1) Restrict marketplace_listings contact PII columns
REVOKE SELECT (contact_email, contact_phone) ON public.marketplace_listings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_listing_contact(_listing_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.contact_email, l.contact_phone
  FROM public.marketplace_listings l
  WHERE l.id = _listing_id
    AND auth.uid() IS NOT NULL
    AND (l.status = 'active' OR l.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;
REVOKE ALL ON FUNCTION public.get_listing_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_contact(uuid) TO authenticated;

-- 2) Restrict marketplace_orders buyer PII columns from direct reads;
--    server functions use the service-role client and are unaffected.
REVOKE SELECT (contact_email, contact_phone, shipping_address)
  ON public.marketplace_orders FROM anon, authenticated;

-- 3) Vehicle photos in the private bucket must require auth
DROP POLICY IF EXISTS "Vehicle photos publicly readable" ON storage.objects;
CREATE POLICY "Authenticated users can read vehicle photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-photos');

-- 4) Lock search_path on email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 5) Tighten always-true insert policy on vehicle_leads
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.vehicle_leads;
CREATE POLICY "Public can submit a vehicle lead"
ON public.vehicle_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(full_name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 320
  AND (phone IS NULL OR char_length(phone) <= 40)
  AND (message IS NULL OR char_length(message) <= 4000)
  AND (user_id IS NULL OR user_id = auth.uid())
);
