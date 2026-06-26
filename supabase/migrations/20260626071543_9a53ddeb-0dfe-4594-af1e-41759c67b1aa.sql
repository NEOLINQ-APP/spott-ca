
CREATE TABLE public.haiku_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  mode TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.haiku_conversations TO authenticated;
GRANT ALL ON public.haiku_conversations TO service_role;
ALTER TABLE public.haiku_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.haiku_conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX haiku_conversations_user_idx ON public.haiku_conversations(user_id, updated_at DESC);

CREATE TABLE public.haiku_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.haiku_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.haiku_messages TO authenticated;
GRANT ALL ON public.haiku_messages TO service_role;
ALTER TABLE public.haiku_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.haiku_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX haiku_messages_conv_idx ON public.haiku_messages(conversation_id, created_at);

CREATE TABLE public.haiku_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  used_count INT NOT NULL DEFAULT 0,
  free_limit INT NOT NULL DEFAULT 3,
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);
GRANT SELECT, INSERT, UPDATE ON public.haiku_usage TO authenticated;
GRANT ALL ON public.haiku_usage TO service_role;
ALTER TABLE public.haiku_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage read" ON public.haiku_usage FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "own usage write" ON public.haiku_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own usage update" ON public.haiku_usage FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.haiku_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.haiku_audit_log TO authenticated;
GRANT ALL ON public.haiku_audit_log TO service_role;
ALTER TABLE public.haiku_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.haiku_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
