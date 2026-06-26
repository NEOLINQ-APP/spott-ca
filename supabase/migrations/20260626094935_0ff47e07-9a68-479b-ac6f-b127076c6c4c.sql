
CREATE TABLE IF NOT EXISTS public.sparq_settings (
  id text PRIMARY KEY DEFAULT 'global',
  enabled boolean NOT NULL DEFAULT true,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature numeric NOT NULL DEFAULT 0.7,
  system_prompt_override text,
  additional_instructions text,
  offtopic_redirect text NOT NULL DEFAULT 'I''m built to help you with Spott.ca and the businesses on it — want me to help you find a business, listing, or deal?',
  voice_default text NOT NULL DEFAULT 'alloy',
  voice_speed numeric NOT NULL DEFAULT 1.0,
  business_strict_mode boolean NOT NULL DEFAULT true,
  business_additional_rules text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sparq_settings_singleton CHECK (id = 'global')
);

GRANT SELECT, INSERT, UPDATE ON public.sparq_settings TO authenticated;
GRANT ALL ON public.sparq_settings TO service_role;

ALTER TABLE public.sparq_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sparq settings"
  ON public.sparq_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sparq settings"
  ON public.sparq_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sparq settings"
  ON public.sparq_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.sparq_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
