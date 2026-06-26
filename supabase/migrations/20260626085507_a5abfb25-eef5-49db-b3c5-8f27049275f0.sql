
-- Sparq learning: capture identity on conversations and give Zeus (admins) read access
ALTER TABLE public.haiku_conversations
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

CREATE INDEX IF NOT EXISTS haiku_conversations_user_email_idx ON public.haiku_conversations (user_email);
CREATE INDEX IF NOT EXISTS haiku_conversations_last_message_at_idx ON public.haiku_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS haiku_messages_conversation_id_idx ON public.haiku_messages (conversation_id, created_at);

-- Zeus / admin read access (full corpus for learning + analytics)
DROP POLICY IF EXISTS "admins read all conversations" ON public.haiku_conversations;
CREATE POLICY "admins read all conversations"
  ON public.haiku_conversations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read all messages" ON public.haiku_messages;
CREATE POLICY "admins read all messages"
  ON public.haiku_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Distilled learning insights table (Zeus-only training corpus)
CREATE TABLE IF NOT EXISTS public.sparq_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.haiku_conversations(id) ON DELETE SET NULL,
  user_id uuid,
  user_email text,
  category text,
  intent text,
  summary text NOT NULL,
  raw_excerpt text,
  sentiment text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sparq_learnings TO authenticated;
GRANT ALL ON public.sparq_learnings TO service_role;

ALTER TABLE public.sparq_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage learnings"
  ON public.sparq_learnings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS sparq_learnings_created_at_idx ON public.sparq_learnings (created_at DESC);
CREATE INDEX IF NOT EXISTS sparq_learnings_category_idx ON public.sparq_learnings (category);
