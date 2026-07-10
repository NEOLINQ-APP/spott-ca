
-- 1. User-to-user referrals (distinct from promoter-scoped `referrals` and `business_referrals`)
CREATE TABLE public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | qualified | rewarded
  qualified_at timestamptz,
  rewarded_at timestamptz,
  reward_type text, -- 'featured_30d'
  reward_applied_to uuid, -- listing or business id
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_referrals TO authenticated;
GRANT ALL ON public.user_referrals TO service_role;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own referrals (as referrer or referred)"
  ON public.user_referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Referrer can update reward application"
  ON public.user_referrals FOR UPDATE TO authenticated
  USING (auth.uid() = referrer_user_id)
  WITH CHECK (auth.uid() = referrer_user_id);

CREATE INDEX idx_user_referrals_referrer ON public.user_referrals(referrer_user_id);
CREATE INDEX idx_user_referrals_status ON public.user_referrals(status);

-- 2. Welcome-sequence tracking
CREATE TABLE public.welcome_sequence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step int NOT NULL, -- 1, 2, 3
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step)
);
GRANT SELECT ON public.welcome_sequence_log TO authenticated;
GRANT ALL ON public.welcome_sequence_log TO service_role;
ALTER TABLE public.welcome_sequence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own welcome log"
  ON public.welcome_sequence_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Auto-generate referral_code on profile insert if missing
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := 'SPOTT-' || upper(substring(md5(NEW.id::text || clock_timestamp()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_referral_code ON public.profiles;
CREATE TRIGGER trg_ensure_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_referral_code();

-- Backfill existing profiles missing a code
UPDATE public.profiles
SET referral_code = 'SPOTT-' || upper(substring(md5(id::text || created_at::text), 1, 6))
WHERE referral_code IS NULL OR referral_code = '';

-- 4. Link referrer when new profile signs up with `referred_by_code`
CREATE OR REPLACE FUNCTION public.link_user_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  IF NEW.referred_by_code IS NOT NULL AND NEW.referred_by_code <> '' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = NEW.referred_by_code
    LIMIT 1;

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
      INSERT INTO public.user_referrals (referrer_user_id, referred_user_id, referral_code, status)
      VALUES (v_referrer_id, NEW.id, NEW.referred_by_code, 'pending')
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_user_referral ON public.profiles;
CREATE TRIGGER trg_link_user_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_user_referral();

-- 5. Qualify referral when referred user posts their first marketplace listing
CREATE OR REPLACE FUNCTION public.qualify_user_referral_on_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_referrals
  SET status = 'qualified', qualified_at = now(), updated_at = now()
  WHERE referred_user_id = NEW.user_id
    AND status = 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qualify_user_referral ON public.marketplace_listings;
CREATE TRIGGER trg_qualify_user_referral
  AFTER INSERT ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.qualify_user_referral_on_listing();
