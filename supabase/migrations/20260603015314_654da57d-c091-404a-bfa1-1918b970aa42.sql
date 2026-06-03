
-- 1) Marketplace listing extensions: commission + compare-at price
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS commission_cents integer,
  ADD COLUMN IF NOT EXISTS compare_at_price_cents integer;

-- 2) Business verification requests
CREATE TABLE IF NOT EXISTS public.business_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid,
  business_name text NOT NULL,
  legal_name text,
  business_type text NOT NULL,
  tax_number text,
  contact_email text NOT NULL,
  contact_phone text,
  website text,
  address text,
  city text,
  province text,
  postal_code text,
  document_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.business_verification_requests TO authenticated;
GRANT ALL ON public.business_verification_requests TO service_role;

ALTER TABLE public.business_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification requests"
  ON public.business_verification_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own verification requests"
  ON public.business_verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update verification requests"
  ON public.business_verification_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bvr_set_updated_at
  BEFORE UPDATE ON public.business_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Storage RLS for the private business-verification bucket
-- Owners can upload/read/delete files under their own {user_id}/... prefix; admins can read all.
CREATE POLICY "bv owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-verification'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "bv owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "bv owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-verification'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );
