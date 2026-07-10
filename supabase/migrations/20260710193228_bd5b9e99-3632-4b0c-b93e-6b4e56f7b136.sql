
-- Registration number on claims
ALTER TABLE public.business_claims
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS registration_jurisdiction text;

-- Preserve registration fields on UPDATE like other claimant-provided fields
CREATE OR REPLACE FUNCTION public.protect_business_claims_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.claimant_id            := OLD.claimant_id;
  NEW.business_id            := OLD.business_id;
  NEW.claimant_email         := OLD.claimant_email;
  NEW.claimant_phone         := OLD.claimant_phone;
  NEW.claimant_role          := OLD.claimant_role;
  NEW.proof_notes            := OLD.proof_notes;
  NEW.registration_number    := OLD.registration_number;
  NEW.registration_jurisdiction := OLD.registration_jurisdiction;
  NEW.created_at             := OLD.created_at;
  RETURN NEW;
END;
$$;

-- Append-only disclosure audit log
CREATE TABLE IF NOT EXISTS public.vehicle_disclosure_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attestation jsonb NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_hash text
);

CREATE INDEX IF NOT EXISTS vehicle_disclosure_audit_vehicle_idx
  ON public.vehicle_disclosure_audit(vehicle_id, signed_at DESC);

GRANT SELECT, INSERT ON public.vehicle_disclosure_audit TO authenticated;
GRANT ALL ON public.vehicle_disclosure_audit TO service_role;

ALTER TABLE public.vehicle_disclosure_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellers insert own disclosure audit"
  ON public.vehicle_disclosure_audit
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sellers read own disclosure audit"
  ON public.vehicle_disclosure_audit
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
-- No UPDATE/DELETE policies: append-only.
