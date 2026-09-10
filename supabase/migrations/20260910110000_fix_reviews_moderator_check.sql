-- Round 2 fix: the prior migration left WITH CHECK implicit (NULL) on
-- "Users update own reviews, admins and moderators moderate any",
-- expecting Postgres to default it to the USING expression. Live-tested
-- with a real moderator account and it does NOT work that way once
-- combined with the table's other permissive policy ("Owners can reply
-- to reviews") — the update was rejected with a real RLS violation.
-- Setting WITH CHECK explicitly instead of relying on any default.
DROP POLICY "Users update own reviews, admins and moderators moderate any" ON public.reviews;
CREATE POLICY "Users update own reviews, admins and moderators moderate any" ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
