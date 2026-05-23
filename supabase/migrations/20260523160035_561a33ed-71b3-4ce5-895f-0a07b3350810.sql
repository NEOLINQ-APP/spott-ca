
-- Fix 1: business-photos storage policies use wrong alias (b.name instead of objects.name)
DROP POLICY IF EXISTS "business-photos owner delete" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner upload" ON storage.objects;

CREATE POLICY "business-photos owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

CREATE POLICY "business-photos owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
)
WITH CHECK (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

CREATE POLICY "business-photos owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

-- Fix 2: businesses INSERT must force status = 'pending' (admins bypass via separate path)
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;

CREATE POLICY "Authenticated users can create businesses"
ON public.businesses FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    status = 'pending'::business_status
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Fix 3: allow claimants to withdraw their own pending business claims
CREATE POLICY "Claimants can withdraw pending claims"
ON public.business_claims FOR DELETE TO authenticated
USING (
  (claimant_id = auth.uid() AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
