DROP POLICY IF EXISTS "users manage own voice trial" ON public.sparq_voice_trials;

-- Read-only from the client; writes go through the server function using the
-- service role so the trial cap cannot be bypassed by direct table edits.
CREATE POLICY "voice trial read own"
  ON public.sparq_voice_trials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.sparq_voice_trials FROM authenticated;
GRANT SELECT ON public.sparq_voice_trials TO authenticated;
GRANT ALL ON public.sparq_voice_trials TO service_role;