-- BARIO CRM integration foundation. Spott has no general lead-capture
-- form on real business listings today (business.$slug.tsx only renders
-- tel:/mailto: links) and no third-party service-credential mechanism
-- (only real Supabase user-JWT bearer auth) — this migration adds both,
-- plus a human-approval claim/connect flow and an outbound webhook queue
-- so a business's real leads/promotions/reviews can flow into their own
-- BARIO CRM. Follows sponsored_listing_leads' RLS convention (service-
-- role-only writes, no anon INSERT policy) rather than the older
-- vehicle_leads pattern.

-- business_leads: general lead capture, any real business listing.
CREATE TABLE public.business_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  message text,
  source text NOT NULL DEFAULT 'spott_listing',
  promotion_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  referrer text,
  crm_sync_status text NOT NULL DEFAULT 'pending',
  crm_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_leads_source_check CHECK (source IN ('spott_listing', 'spott_promotion')),
  CONSTRAINT business_leads_crm_sync_status_check CHECK (crm_sync_status IN ('pending', 'queued', 'delivered', 'failed', 'no_integration'))
);

GRANT ALL ON public.business_leads TO service_role;
ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated INSERT policy on purpose — all writes go through
-- submitBusinessLead()'s service-role client, same reasoning as
-- sponsored_listing_leads ("so this can't be spammed by direct anon
-- table access").
CREATE POLICY "Business owners view their leads"
  ON public.business_leads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
         OR has_role(auth.uid(), 'admin'::app_role));

-- crm_integrations: the per-business API credential. Deliberately one
-- row per approved connection, never a global shared secret — this is
-- what makes cross-tenant access structurally impossible, not just
-- policy-forbidden.
CREATE TABLE public.crm_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  external_org_id text NOT NULL,
  external_org_name text,
  api_key_hash text NOT NULL,
  api_key_prefix text NOT NULL,
  webhook_signing_secret text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  approved_by_user_id uuid NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_integrations_status_check CHECK (status IN ('active', 'revoked'))
);

GRANT ALL ON public.crm_integrations TO service_role;
ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own integration"
  ON public.crm_integrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
         OR has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policy for any role but service_role — every
-- mutation goes through a server function (create on approval exchange,
-- revoke on request).

-- crm_connection_requests: the human-approval checkpoint's state machine.
-- A BARIO org can request to connect to a listing; only the real,
-- logged-in Spott owner of that listing can approve it.
CREATE TABLE public.crm_connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requesting_org_id text NOT NULL,
  requesting_org_name text NOT NULL,
  requesting_contact_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  connection_code text,
  connection_code_expires_at timestamptz,
  approved_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  CONSTRAINT crm_connection_requests_status_check CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'exchanged'))
);

GRANT ALL ON public.crm_connection_requests TO service_role;
ALTER TABLE public.crm_connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own connection requests"
  ON public.crm_connection_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
         OR has_role(auth.uid(), 'admin'::app_role));

-- spott_promotions: a business creates a real consumer-facing offer.
-- Distinct from promo_codes/admin_coupons/listing_promotions, which are
-- marketplace-boost/referral-commission oriented, not this.
CREATE TABLE public.spott_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_via text NOT NULL DEFAULT 'spott',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spott_promotions_status_check CHECK (status IN ('active', 'paused', 'expired')),
  CONSTRAINT spott_promotions_created_via_check CHECK (created_via IN ('spott', 'bario_crm'))
);

GRANT ALL ON public.spott_promotions TO service_role;
ALTER TABLE public.spott_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promotions viewable by all when active"
  ON public.spott_promotions FOR SELECT USING (status = 'active');
CREATE POLICY "Owners manage own promotions"
  ON public.spott_promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
         OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
              OR has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.business_leads
  ADD CONSTRAINT business_leads_promotion_fk FOREIGN KEY (promotion_id) REFERENCES public.spott_promotions(id);

-- Outbound webhook delivery queue — mirrors email_infra.sql's pgmq
-- pattern (already proven in production for transactional email) rather
-- than inventing a new job system.
DO $$ BEGIN PERFORM pgmq.create('crm_webhooks'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('crm_webhooks_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE public.crm_webhook_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  event_type text NOT NULL,
  business_id uuid NOT NULL,
  status text NOT NULL,
  response_status int,
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_webhook_send_log_status_check CHECK (status IN ('pending', 'sent', 'failed', 'dlq'))
);
GRANT ALL ON public.crm_webhook_send_log TO service_role;
ALTER TABLE public.crm_webhook_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages webhook log" ON public.crm_webhook_send_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE UNIQUE INDEX idx_crm_webhook_log_msg_sent ON public.crm_webhook_send_log(message_id) WHERE status = 'sent';

CREATE TABLE public.crm_webhook_send_state (
  id int PRIMARY KEY DEFAULT 1,
  batch_size int NOT NULL DEFAULT 10,
  send_delay_ms int NOT NULL DEFAULT 200,
  ttl_minutes int NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_webhook_send_state_singleton_check CHECK (id = 1)
);
INSERT INTO public.crm_webhook_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT ALL ON public.crm_webhook_send_state TO service_role;
ALTER TABLE public.crm_webhook_send_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages webhook state" ON public.crm_webhook_send_state FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- RPC wrappers, mirroring email_infra.sql's enqueue_email/read_email_batch/
-- delete_email/move_to_dlq shape exactly (SECURITY DEFINER, revoked from
-- PUBLIC, granted to service_role only) under new names so they don't
-- collide with the email queue's own functions.
CREATE OR REPLACE FUNCTION public.enqueue_crm_webhook(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  msg_id bigint;
BEGIN
  SELECT pgmq.send(queue_name, payload) INTO msg_id;
  RETURN msg_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_crm_webhook(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_crm_webhook(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.read_crm_webhook_batch(queue_name text, batch_size int, vt_seconds int)
RETURNS SETOF pgmq.message_record
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT * FROM pgmq.read(queue_name, vt_seconds, batch_size);
$$;
REVOKE ALL ON FUNCTION public.read_crm_webhook_batch(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_crm_webhook_batch(text, int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_crm_webhook(queue_name text, msg_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT pgmq.delete(queue_name, msg_id);
$$;
REVOKE ALL ON FUNCTION public.delete_crm_webhook(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_crm_webhook(text, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.move_crm_webhook_to_dlq(queue_name text, dlq_name text, msg_id bigint, msg jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  PERFORM pgmq.send(dlq_name, msg);
  PERFORM pgmq.delete(queue_name, msg_id);
END;
$$;
REVOKE ALL ON FUNCTION public.move_crm_webhook_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_crm_webhook_to_dlq(text, text, bigint, jsonb) TO service_role;

CREATE INDEX idx_business_leads_business ON public.business_leads(business_id, created_at DESC);
CREATE INDEX idx_business_leads_sync_status ON public.business_leads(crm_sync_status) WHERE crm_sync_status IN ('pending', 'failed');
CREATE INDEX idx_crm_integrations_business ON public.crm_integrations(business_id) WHERE status = 'active';
CREATE INDEX idx_crm_conn_req_business ON public.crm_connection_requests(business_id, status);
