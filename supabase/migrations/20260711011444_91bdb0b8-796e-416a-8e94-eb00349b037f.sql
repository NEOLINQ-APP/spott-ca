
-- 1) Revoke public column access to seller contact PII on marketplace_listings.
REVOKE SELECT (contact_email, contact_phone) ON public.marketplace_listings FROM anon, authenticated;
GRANT SELECT (contact_email, contact_phone) ON public.marketplace_listings TO service_role;

-- 2) Restrict user_follows visibility to the participants.
DROP POLICY IF EXISTS "Follows viewable by authenticated" ON public.user_follows;
CREATE POLICY "Follows viewable by participants"
  ON public.user_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);
