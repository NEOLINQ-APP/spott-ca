
-- User-to-user follows
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  followee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT ON public.user_follows TO anon;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows viewable by all" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users insert own follows" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);
CREATE INDEX idx_user_follows_followee ON public.user_follows(followee_id);
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);

-- Marketplace DM threads (buyer <-> seller, per listing)
CREATE TABLE public.mp_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  seller_last_read_at timestamptz,
  buyer_last_read_at timestamptz,
  UNIQUE (listing_id, buyer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.mp_threads TO authenticated;
GRANT ALL ON public.mp_threads TO service_role;
ALTER TABLE public.mp_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view mp_threads" ON public.mp_threads FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);
CREATE POLICY "Buyer can start mp_thread" ON public.mp_threads FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND buyer_id <> seller_id);
CREATE POLICY "Participants update mp_thread" ON public.mp_threads FOR UPDATE
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE TABLE public.mp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.mp_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mp_messages TO authenticated;
GRANT ALL ON public.mp_messages TO service_role;
ALTER TABLE public.mp_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_mp_thread_participant(_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mp_threads t
    WHERE t.id = _thread_id AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid()));
$$;

CREATE POLICY "MP messages visible to participants" ON public.mp_messages FOR SELECT
  USING (public.is_mp_thread_participant(thread_id));
CREATE POLICY "Participants send mp_messages" ON public.mp_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.is_mp_thread_participant(thread_id));

CREATE OR REPLACE FUNCTION public.mp_touch_thread() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.mp_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;
CREATE TRIGGER mp_messages_touch_thread AFTER INSERT ON public.mp_messages
  FOR EACH ROW EXECUTE FUNCTION public.mp_touch_thread();

CREATE INDEX idx_mp_messages_thread ON public.mp_messages(thread_id, created_at);
CREATE INDEX idx_mp_threads_seller ON public.mp_threads(seller_id);
CREATE INDEX idx_mp_threads_buyer ON public.mp_threads(buyer_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_threads;
