
-- Sparq workspaces (one per business installing Sparq on their site)
CREATE TABLE public.sparq_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  business_name text NOT NULL,
  assistant_name text NOT NULL DEFAULT 'Sparq',
  brand_color text NOT NULL DEFAULT '#3B82F6',
  greeting text NOT NULL DEFAULT 'Hi! How can I help you today?',
  knowledge_base text,
  website_url text,
  allowed_domains text[] NOT NULL DEFAULT '{}',
  plan_tier text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'trial', -- trial | active | past_due | canceled
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  messages_this_month int NOT NULL DEFAULT 0,
  monthly_message_limit int NOT NULL DEFAULT 500,
  month_anchor date NOT NULL DEFAULT (date_trunc('month', now())::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sparq_workspaces_owner ON public.sparq_workspaces(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sparq_workspaces TO authenticated;
GRANT ALL ON public.sparq_workspaces TO service_role;

ALTER TABLE public.sparq_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their workspaces"
  ON public.sparq_workspaces FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_sparq_workspaces_updated
  BEFORE UPDATE ON public.sparq_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-workspace message log (for analytics and quota)
CREATE TABLE public.sparq_workspace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.sparq_workspaces(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  visitor_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sparq_ws_messages_ws ON public.sparq_workspace_messages(workspace_id, created_at DESC);

GRANT SELECT, INSERT ON public.sparq_workspace_messages TO authenticated;
GRANT ALL ON public.sparq_workspace_messages TO service_role;

ALTER TABLE public.sparq_workspace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their workspace messages"
  ON public.sparq_workspace_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sparq_workspaces w
    WHERE w.id = workspace_id
      AND (w.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- Public read of safe widget config by slug (used by the embed script)
CREATE OR REPLACE FUNCTION public.get_sparq_widget_config(_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  assistant_name text,
  brand_color text,
  greeting text,
  business_name text,
  status text,
  trial_ends_at timestamptz,
  messages_this_month int,
  monthly_message_limit int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, slug, assistant_name, brand_color, greeting, business_name,
         status, trial_ends_at, messages_this_month, monthly_message_limit
  FROM public.sparq_workspaces
  WHERE slug = _slug
$$;

GRANT EXECUTE ON FUNCTION public.get_sparq_widget_config(text) TO anon, authenticated;
