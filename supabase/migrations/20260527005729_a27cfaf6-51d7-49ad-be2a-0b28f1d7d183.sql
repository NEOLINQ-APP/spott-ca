
-- 1) business_views: allow admins to read
DROP POLICY IF EXISTS "Users view own business_views" ON public.business_views;
DROP POLICY IF EXISTS "Users can view own business_views" ON public.business_views;
DROP POLICY IF EXISTS "business_views_select_own" ON public.business_views;
CREATE POLICY "Users and admins view business_views"
ON public.business_views FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) businesses: lock owner_id on owner UPDATE
DROP POLICY IF EXISTS "Owners and admins can update" ON public.businesses;
DROP POLICY IF EXISTS "Owners and admins update businesses" ON public.businesses;
CREATE POLICY "Owners and admins update businesses"
ON public.businesses FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    auth.uid() = owner_id
    AND owner_id = (SELECT b.owner_id FROM public.businesses b WHERE b.id = businesses.id)
    AND status = (SELECT b.status FROM public.businesses b WHERE b.id = businesses.id)
  )
);

-- 3) dm_messages: allow sender or admin to delete
CREATE POLICY "Sender or admin can delete dm_messages"
ON public.dm_messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR public.has_role(auth.uid(), 'admin'));

-- 4) reviews: restrict owner reply UPDATE to reply columns only
DROP POLICY IF EXISTS "Owners can reply to reviews" ON public.reviews;
CREATE POLICY "Owners can reply to reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = reviews.business_id AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = reviews.business_id AND b.owner_id = auth.uid()
  )
  AND user_id     = (SELECT r.user_id     FROM public.reviews r WHERE r.id = reviews.id)
  AND business_id = (SELECT r.business_id FROM public.reviews r WHERE r.id = reviews.id)
  AND rating      = (SELECT r.rating      FROM public.reviews r WHERE r.id = reviews.id)
  AND body        IS NOT DISTINCT FROM (SELECT r.body FROM public.reviews r WHERE r.id = reviews.id)
  AND created_at  = (SELECT r.created_at  FROM public.reviews r WHERE r.id = reviews.id)
);
