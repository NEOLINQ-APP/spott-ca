
-- Fix 1: Restrict profile contact fields from public reads via column grants
REVOKE SELECT (contact_email, contact_phone) ON public.profiles FROM anon;
REVOKE SELECT (contact_email, contact_phone) ON public.profiles FROM authenticated;
GRANT SELECT (contact_email, contact_phone) ON public.profiles TO service_role;

-- Fix 2: Restrict vehicle-photos bucket reads to the owning user (path prefix = auth.uid())
DROP POLICY IF EXISTS "Authenticated users can read vehicle photos" ON storage.objects;
CREATE POLICY "Owners can read own vehicle photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
