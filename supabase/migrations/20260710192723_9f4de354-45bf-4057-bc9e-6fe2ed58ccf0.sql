
-- Phase 1: Compliance-first vehicle disclosures + dealer verification

-- 1.1 Vehicle disclosures + all-in pricing
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS prior_use text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS odometer_status text NOT NULL DEFAULT 'accurate',
  ADD COLUMN IF NOT EXISTS damage_amount_cents integer,
  ADD COLUMN IF NOT EXISTS carfax_url text,
  ADD COLUMN IF NOT EXISTS disclosure_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS disclosure_signed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS price_all_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_excludes text[] NOT NULL DEFAULT ARRAY['GST','PST','HST','QST']::text[],
  ADD COLUMN IF NOT EXISTS compliance_flags text[] NOT NULL DEFAULT '{}'::text[];

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_prior_use_chk
    CHECK (prior_use IN ('personal','lease','rental','taxi','rideshare','emergency','fleet','police','driver_ed','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_odometer_status_chk
    CHECK (odometer_status IN ('accurate','exceeds_mechanical_limits','not_actual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_accident_history_chk
    CHECK (accident_history IS NULL OR accident_history IN ('none_declared','minor','major','structural','salvage_rebuilt','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1.3 Dealer verification on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS dealer_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dealer_license_number text,
  ADD COLUMN IF NOT EXISTS dealer_license_province text,
  ADD COLUMN IF NOT EXISTS dealer_license_expires_at date,
  ADD COLUMN IF NOT EXISTS dealer_verified_at timestamptz;

ALTER TABLE public.business_verification_requests
  ADD COLUMN IF NOT EXISTS dealer_license_number text,
  ADD COLUMN IF NOT EXISTS dealer_license_province text,
  ADD COLUMN IF NOT EXISTS dealer_license_expires_at date,
  ADD COLUMN IF NOT EXISTS business_license_path text,
  ADD COLUMN IF NOT EXISTS is_dealer_request boolean NOT NULL DEFAULT false;

-- Publish gate: dealer listings need verification + signed disclosures.
CREATE OR REPLACE FUNCTION public.enforce_vehicle_publish_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified boolean;
BEGIN
  -- Only enforce on transitions into a publicly-visible state.
  IF NEW.status NOT IN ('active','featured') THEN
    RETURN NEW;
  END IF;

  IF NEW.seller_type = 'dealer' OR NEW.dealer_business_id IS NOT NULL THEN
    IF NEW.dealer_business_id IS NULL THEN
      RAISE EXCEPTION 'Dealer listings must be linked to a business (dealer_business_id).';
    END IF;

    SELECT dealer_verified INTO v_verified FROM public.businesses WHERE id = NEW.dealer_business_id;
    IF NOT COALESCE(v_verified, false) THEN
      RAISE EXCEPTION 'Dealer is not verified. Complete dealer verification (business license + regulator number) before publishing.';
    END IF;

    IF NEW.disclosure_signed_at IS NULL THEN
      RAISE EXCEPTION 'Compliance disclosures must be signed before publishing (prior use, odometer, accident history).';
    END IF;

    IF NEW.accident_history IS NULL THEN
      RAISE EXCEPTION 'Accident/damage history disclosure is required.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vehicle_publish_compliance ON public.vehicles;
CREATE TRIGGER trg_enforce_vehicle_publish_compliance
BEFORE INSERT OR UPDATE OF status, disclosure_signed_at, accident_history, dealer_business_id ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_publish_compliance();

-- Helper: is caller the owner of the referenced dealership?
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND owner_id = auth.uid());
$$;
