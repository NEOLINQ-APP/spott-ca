-- SPOTT Auto -> Bario One real lead sync queue. Mirrors
-- 20260821154356_bario_crm_integration.sql's pgmq queue/DLQ/RPC/log/state
-- shape exactly (same proven production pattern, already handling
-- business_leads -> Bario CRM) but for ONE shared Spott-Auto-wide
-- connection rather than a per-business crm_integrations row — Spott Auto
-- is a single company-wide integration into Bario's own CRM, not a
-- per-business external one, per the user's explicit choice to reuse the
-- real https://bario.ca/api/bario-one/spott/webhook receiver.
DO $$ BEGIN PERFORM pgmq.create('bario_lead_sync'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('bario_lead_sync_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE public.bario_lead_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  event_type text NOT NULL,
  application_id uuid NOT NULL,
  status text NOT NULL,
  response_status int,
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bario_lead_sync_log_status_check CHECK (status IN ('pending', 'sent', 'failed', 'dlq'))
);
GRANT ALL ON public.bario_lead_sync_log TO service_role;
ALTER TABLE public.bario_lead_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view bario lead sync log"
  ON public.bario_lead_sync_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages bario lead sync log" ON public.bario_lead_sync_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE UNIQUE INDEX idx_bario_lead_sync_log_msg_sent ON public.bario_lead_sync_log(message_id) WHERE status = 'sent';

CREATE TABLE public.bario_lead_sync_state (
  id int PRIMARY KEY DEFAULT 1,
  batch_size int NOT NULL DEFAULT 10,
  send_delay_ms int NOT NULL DEFAULT 200,
  ttl_minutes int NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bario_lead_sync_state_singleton_check CHECK (id = 1)
);
INSERT INTO public.bario_lead_sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT ALL ON public.bario_lead_sync_state TO service_role;
ALTER TABLE public.bario_lead_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages bario lead sync state" ON public.bario_lead_sync_state FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- RPC wrappers, same SECURITY DEFINER / revoked-from-PUBLIC / service_role-only
-- shape as enqueue_crm_webhook and friends, under new names so they don't
-- collide with the existing CRM webhook queue's functions.
CREATE OR REPLACE FUNCTION public.enqueue_bario_lead_sync(queue_name text, payload jsonb)
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
REVOKE ALL ON FUNCTION public.enqueue_bario_lead_sync(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_bario_lead_sync(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.read_bario_lead_sync_batch(queue_name text, batch_size int, vt_seconds int)
RETURNS SETOF pgmq.message_record
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT * FROM pgmq.read(queue_name, vt_seconds, batch_size);
$$;
REVOKE ALL ON FUNCTION public.read_bario_lead_sync_batch(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_bario_lead_sync_batch(text, int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_bario_lead_sync(queue_name text, msg_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT pgmq.delete(queue_name, msg_id);
$$;
REVOKE ALL ON FUNCTION public.delete_bario_lead_sync(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_bario_lead_sync(text, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.move_bario_lead_sync_to_dlq(queue_name text, dlq_name text, msg_id bigint, msg jsonb)
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
REVOKE ALL ON FUNCTION public.move_bario_lead_sync_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_bario_lead_sync_to_dlq(text, text, bigint, jsonb) TO service_role;

CREATE INDEX idx_bario_lead_sync_log_application ON public.bario_lead_sync_log(application_id, created_at DESC);
