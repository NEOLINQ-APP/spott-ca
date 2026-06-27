
CREATE TABLE public.sparq_voice_trials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_used_at timestamptz NOT NULL DEFAULT now(),
  seconds_used integer NOT NULL DEFAULT 0,
  card_on_file boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sparq_voice_trials TO authenticated;
GRANT ALL ON public.sparq_voice_trials TO service_role;
ALTER TABLE public.sparq_voice_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own voice trial" ON public.sparq_voice_trials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
