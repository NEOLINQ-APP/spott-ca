
-- 1) Prevent owners from self-approving their listings.
DROP POLICY IF EXISTS "Owners and admins can update" ON public.businesses;

CREATE POLICY "Owners and admins can update"
ON public.businesses
FOR UPDATE
USING ((owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    owner_id = auth.uid()
    AND status = (SELECT b.status FROM public.businesses b WHERE b.id = businesses.id)
  )
);

-- 2) Align business-photos storage policies with the actual user-id folder structure.
DROP POLICY IF EXISTS "business-photos owner upload" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner delete" ON storage.objects;

CREATE POLICY "business-photos owner upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "business-photos owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'business-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "business-photos owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
