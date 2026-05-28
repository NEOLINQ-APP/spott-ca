
DROP POLICY IF EXISTS "business-photos owner upload" ON storage.objects;

CREATE POLICY "business-photos owner upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
  )
);
