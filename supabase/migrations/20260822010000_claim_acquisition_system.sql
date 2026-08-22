-- Business Claim & Customer Acquisition System. Reuses the existing
-- imported_businesses pipeline (already creates unclaimed listings) and
-- the existing suppressed_emails/email_unsubscribe_tokens tables (schema
-- existed but was completely unwired to any code) rather than inventing
-- new mechanisms for either.

-- businesses.claim_status: additive, alongside the existing is_claimed
-- boolean (never removed/renamed — too much existing code reads it).
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'unclaimed';
ALTER TABLE public.businesses ADD CONSTRAINT businesses_claim_status_check
  CHECK (claim_status IN ('unclaimed', 'invited', 'claim_started', 'verification_pending', 'claimed', 'verified', 'rejected', 'suspended'));
-- Approved+claimed businesses are already 'claimed' in effect; backfill so
-- the new column starts consistent with the boolean that's been driving
-- real behavior all along.
UPDATE public.businesses SET claim_status = 'claimed' WHERE is_claimed = true AND claim_status = 'unclaimed';

-- claim_invitations: the token-based invitation, distinct from
-- business_claims (that table is a *manual* ownership-proof application
-- flow with document upload; this is a *pre-vetted* invite where the
-- token itself, tied to a specific contact email, is the credential).
CREATE TABLE public.claim_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  contact_email text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'sent',
  campaign_step int NOT NULL DEFAULT 1,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_invitations_status_check CHECK (status IN ('sent', 'opened', 'claim_started', 'verification_pending', 'claimed', 'expired', 'revoked'))
);
GRANT ALL ON public.claim_invitations TO service_role;
ALTER TABLE public.claim_invitations ENABLE ROW LEVEL SECURITY;
-- Deliberately NO public SELECT policy — RLS filters rows, not columns,
-- so "anyone who knows their own token can read their own row" isn't
-- expressible without also permitting a bare `select *` to enumerate
-- every invitation's contact_email and token. The claim-business/:token
-- page instead goes through a service-role server function that does the
-- exact-token lookup itself and returns only the safe preview fields.
-- One active (non-terminal) invitation per business at a time.
CREATE UNIQUE INDEX claim_invitations_active_business_idx ON public.claim_invitations (business_id)
  WHERE status NOT IN ('expired', 'revoked', 'claimed');
CREATE INDEX claim_invitations_token_idx ON public.claim_invitations (token);

-- claim_invitation_log: idempotency for the 4-step drip, same shape as
-- welcome_sequence_log's unique(user_id, step) precedent.
CREATE TABLE public.claim_invitation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.claim_invitations(id) ON DELETE CASCADE,
  step int NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, step)
);
GRANT ALL ON public.claim_invitation_log TO service_role;
ALTER TABLE public.claim_invitation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages invitation log" ON public.claim_invitation_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Outbound acquisition events to Bario One's internal "Spott Acquisition"
-- org — a SEPARATE queue from crm_webhooks (Phase 2's queue is scoped to
-- a business's own connected CRM org; this one is Bario's internal sales
-- pipeline and fires for every business regardless of CRM connection).
DO $$ BEGIN PERFORM pgmq.create('acquisition_events'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('acquisition_events_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE public.acquisition_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  event_type text NOT NULL,
  business_id uuid,
  status text NOT NULL,
  response_status int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_event_log_status_check CHECK (status IN ('sent', 'failed', 'dlq'))
);
GRANT ALL ON public.acquisition_event_log TO service_role;
ALTER TABLE public.acquisition_event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages acquisition event log" ON public.acquisition_event_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.enqueue_acquisition_event(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE msg_id bigint;
BEGIN SELECT pgmq.send(queue_name, payload) INTO msg_id; RETURN msg_id; END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_acquisition_event(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_acquisition_event(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.read_acquisition_event_batch(queue_name text, batch_size int, vt_seconds int)
RETURNS SETOF pgmq.message_record LANGUAGE sql SECURITY DEFINER SET search_path = public, pgmq AS $$
  SELECT * FROM pgmq.read(queue_name, vt_seconds, batch_size);
$$;
REVOKE ALL ON FUNCTION public.read_acquisition_event_batch(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_acquisition_event_batch(text, int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_acquisition_event(queue_name text, msg_id bigint)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public, pgmq AS $$
  SELECT pgmq.delete(queue_name, msg_id);
$$;
REVOKE ALL ON FUNCTION public.delete_acquisition_event(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_acquisition_event(text, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.move_acquisition_event_to_dlq(queue_name text, dlq_name text, msg_id bigint, msg jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
BEGIN PERFORM pgmq.send(dlq_name, msg); PERFORM pgmq.delete(queue_name, msg_id); END;
$$;
REVOKE ALL ON FUNCTION public.move_acquisition_event_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_acquisition_event_to_dlq(text, text, bigint, jsonb) TO service_role;

CREATE INDEX IF NOT EXISTS businesses_claim_status_idx ON public.businesses (claim_status);
