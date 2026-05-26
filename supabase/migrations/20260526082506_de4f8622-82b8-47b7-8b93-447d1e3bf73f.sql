
-- 1. Businesses: lock down INSERT/UPDATE/DELETE so only admins control approval status
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;
CREATE POLICY "Authenticated users can create businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND status = 'pending'::business_status
);

DROP POLICY IF EXISTS "Owners and admins can update" ON public.businesses;
CREATE POLICY "Owners and admins can update"
ON public.businesses
FOR UPDATE
USING ((owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    owner_id = auth.uid()
    AND status = (SELECT b.status FROM public.businesses b WHERE b.id = businesses.id)
  )
);

DROP POLICY IF EXISTS "Admins can delete" ON public.businesses;
CREATE POLICY "Only admins can delete businesses"
ON public.businesses
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. business_follows: make follow activity private to the user
DROP POLICY IF EXISTS "Follows viewable by all" ON public.business_follows;
CREATE POLICY "Users view own follows"
ON public.business_follows
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
