
-- 1) user_friends: restrict SELECT to the two parties or admins
DROP POLICY IF EXISTS "Friends viewable by all" ON public.user_friends;
CREATE POLICY "Friends viewable by parties or admins"
ON public.user_friends
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = friend_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Fix business-photos storage policies (typo: b.name -> name)
DROP POLICY IF EXISTS "business-photos owner upload" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business-photos owner delete" ON storage.objects;

CREATE POLICY "business-photos owner upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "business-photos owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "business-photos owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

-- 3) business_referrals: require inserter to own the referred business
DROP POLICY IF EXISTS "Authenticated users record referral on claim" ON public.business_referrals;
CREATE POLICY "Referred business owner records referral"
ON public.business_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_referrals.referrer_business_id
      AND b.referral_code = business_referrals.referral_code
      AND b.is_claimed = true
  )
  AND EXISTS (
    SELECT 1 FROM public.businesses rb
    WHERE rb.id = business_referrals.referred_business_id
      AND rb.owner_id = auth.uid()
  )
);

-- 4) business_claims: lock down which columns admins may update
CREATE OR REPLACE FUNCTION public.protect_business_claims_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Preserve immutable claimant-provided fields on UPDATE
  NEW.claimant_id    := OLD.claimant_id;
  NEW.business_id    := OLD.business_id;
  NEW.claimant_email := OLD.claimant_email;
  NEW.claimant_phone := OLD.claimant_phone;
  NEW.claimant_role  := OLD.claimant_role;
  NEW.proof_notes    := OLD.proof_notes;
  NEW.created_at     := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_business_claims_columns ON public.business_claims;
CREATE TRIGGER trg_protect_business_claims_columns
BEFORE UPDATE ON public.business_claims
FOR EACH ROW
EXECUTE FUNCTION public.protect_business_claims_columns();
