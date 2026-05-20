
-- Booking link on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS booking_label text;

-- DM threads (one per customer<->business pair)
CREATE TABLE IF NOT EXISTS public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  last_message_at timestamptz,
  owner_last_read_at timestamptz,
  customer_last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, customer_id)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON public.dm_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_threads_business ON public.dm_threads(business_id);
CREATE INDEX IF NOT EXISTS idx_dm_threads_customer ON public.dm_threads(customer_id);

-- Helper: is the current user a participant in this thread?
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads t
    LEFT JOIN public.businesses b ON b.id = t.business_id
    WHERE t.id = _thread_id
      AND (t.customer_id = auth.uid() OR b.owner_id = auth.uid())
  );
$$;

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- Threads: customer or owner can read/update; customer creates
CREATE POLICY "Threads visible to participants"
  ON public.dm_threads FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Customer can start thread"
  ON public.dm_threads FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Participants update thread"
  ON public.dm_threads FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

-- Messages
CREATE POLICY "Messages visible to participants"
  ON public.dm_messages FOR SELECT
  USING (public.is_thread_participant(thread_id));

CREATE POLICY "Participants send messages"
  ON public.dm_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.is_thread_participant(thread_id));

-- Bump last_message_at on new message
CREATE OR REPLACE FUNCTION public.dm_touch_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS dm_touch_thread_trg ON public.dm_messages;
CREATE TRIGGER dm_touch_thread_trg
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_touch_thread();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_threads REPLICA IDENTITY FULL;
