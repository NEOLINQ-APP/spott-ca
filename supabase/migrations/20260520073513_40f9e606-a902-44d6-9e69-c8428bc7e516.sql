
-- 1. Tighten booking_clicks INSERT (no more WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can record a booking click" ON public.booking_clicks;
CREATE POLICY "Anyone can record a click on approved businesses"
ON public.booking_clicks FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = booking_clicks.business_id AND b.status = 'approved')
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 2. Restrict listing of review-photos bucket. Public reads of known paths still work because
--    public buckets serve objects via signed URLs regardless of policy; we only block enumeration.
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Review photos public list" ON storage.objects';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "review_photos_no_anon_list"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'review-photos');

-- 3. Lock down SECURITY DEFINER helpers. Trigger-only functions: revoke from everyone.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dm_touch_thread() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_review_photo_cap() FROM PUBLIC, anon, authenticated;

-- RLS-helper functions: keep callable by authenticated (RLS needs them), revoke from anon/public.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_thread_participant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_active_price_id(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;

-- 4. Business claim requests
CREATE TABLE IF NOT EXISTS public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  claimant_id uuid NOT NULL,
  claimant_email text NOT NULL,
  claimant_phone text,
  claimant_role text,
  proof_notes text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_claims_business ON public.business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON public.business_claims(status);
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own claims"
ON public.business_claims FOR SELECT TO authenticated
USING (claimant_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can submit a claim"
ON public.business_claims FOR INSERT TO authenticated
WITH CHECK (
  claimant_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_claimed = false)
);

CREATE POLICY "Admins update claims"
ON public.business_claims FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));
