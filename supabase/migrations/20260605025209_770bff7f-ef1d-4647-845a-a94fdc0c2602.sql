
-- 1) promo_codes: restrict SELECT to owners + admin
DROP POLICY IF EXISTS "Anyone authed can view active promo codes" ON public.promo_codes;

CREATE POLICY "Owners and admins can view their promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (owner_type = 'business' AND owner_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  OR (owner_type = 'promoter' AND owner_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid()))
);

-- 2) vehicle_leads: revoke internal-note columns from authenticated role
REVOKE SELECT (admin_notes, ai_notes) ON public.vehicle_leads FROM authenticated;
REVOKE UPDATE (admin_notes, ai_notes) ON public.vehicle_leads FROM authenticated;

-- 3) storage: drop anon read on private vehicle-photos bucket
DROP POLICY IF EXISTS "Anyone can read vehicle photos" ON storage.objects;
