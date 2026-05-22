-- 1) Realtime: remove DM tables from realtime publication.
-- DMs are read/written through server functions; realtime channels currently
-- bypass the is_thread_participant check on direct table queries.
ALTER PUBLICATION supabase_realtime DROP TABLE public.dm_threads;
ALTER PUBLICATION supabase_realtime DROP TABLE public.dm_messages;

-- 2) review-photos: add missing UPDATE policy mirroring DELETE.
CREATE POLICY "Users update own review photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'review-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) business-photos: tighten policies so writes that use a {business_id}/...
-- path require active ownership of that business. The {auth.uid()}/... path
-- remains allowed for the new-listing staging flow.
DROP POLICY IF EXISTS "business_photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "business_photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business_photos owner delete" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner upload" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner delete" ON storage.objects;

CREATE POLICY "business-photos owner upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

CREATE POLICY "business-photos owner update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'business-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

CREATE POLICY "business-photos owner delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'business-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.owner_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = (auth.uid())::text
  )
);

-- 4) Public buckets: remove broad SELECT policies that enable directory
-- listing. The buckets stay marked public so getPublicUrl() still serves the
-- files through the storage proxy; only the bulk-list capability goes away.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Review photos public read" ON storage.objects;
DROP POLICY IF EXISTS "business-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_no_anon_list" ON storage.objects;
DROP POLICY IF EXISTS "business_photos viewable by all" ON storage.objects;

-- 5) SECURITY DEFINER functions: lock down execute grants.
-- Trigger-only functions never need to be called by clients.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_review_photo_cap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dm_touch_thread() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_referral_reward() FROM PUBLIC, anon, authenticated;

-- These helpers are called from RLS policies, so authenticated must keep
-- EXECUTE for policies to evaluate. Revoke only from anon, which never needs
-- to call them directly via RPC.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_thread_participant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_active_price_id(uuid, text) FROM PUBLIC, anon;