
-- Add referral_code to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Backfill codes for already-claimed businesses
UPDATE public.businesses
SET referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE is_claimed = true AND referral_code IS NULL;

-- Auto-generate referral code when a business becomes claimed
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_claimed = true AND NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_businesses_referral_code ON public.businesses;
CREATE TRIGGER trg_businesses_referral_code
BEFORE INSERT OR UPDATE OF is_claimed ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.ensure_referral_code();

-- Referrals table
CREATE TABLE IF NOT EXISTS public.business_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  referred_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  referred_claim_id uuid REFERENCES public.business_claims(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | claimed | rewarded
  reward_granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer or admin views referrals"
ON public.business_referrals FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = referrer_business_id AND b.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins manage referrals"
ON public.business_referrals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users record referral on claim"
ON public.business_referrals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referrer_business_id
      AND b.referral_code = business_referrals.referral_code
      AND b.is_claimed = true
  )
);

-- When an admin approves a claim that has a referral, extend the referrer's featured_until by 30 days
CREATE OR REPLACE FUNCTION public.grant_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT * INTO ref FROM public.business_referrals
      WHERE referred_claim_id = NEW.id AND status = 'pending'
      LIMIT 1;
    IF FOUND THEN
      UPDATE public.businesses
      SET featured_until = GREATEST(COALESCE(featured_until, now()), now()) + interval '30 days'
      WHERE id = ref.referrer_business_id;
      UPDATE public.business_referrals
      SET status = 'rewarded', reward_granted_at = now(), referred_business_id = NEW.business_id
      WHERE id = ref.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grant_referral_reward ON public.business_claims;
CREATE TRIGGER trg_grant_referral_reward
AFTER UPDATE ON public.business_claims
FOR EACH ROW EXECUTE FUNCTION public.grant_referral_reward();

REVOKE EXECUTE ON FUNCTION public.ensure_referral_code() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.grant_referral_reward() FROM public, anon;
