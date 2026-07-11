
-- 1) marketplace_orders: drop buyer UPDATE policy. All order mutations go through server functions with service role.
DROP POLICY IF EXISTS "Buyers update own pending orders" ON public.marketplace_orders;

-- 2) subscriber_profiles: restrict INSERT so callers cannot spoof someone else's user_id.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscriber_profiles;
CREATE POLICY "Anyone can subscribe"
  ON public.subscriber_profiles
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
