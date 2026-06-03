
-- 1) Hide seller contact info from anonymous visitors (column-level)
REVOKE SELECT ON public.marketplace_listings FROM anon;
GRANT SELECT (
  id, title, description, price_cents, compare_at_price_cents, commission_cents,
  currency, condition, listing_type, city, province, postal_code, latitude, longitude,
  status, view_count, created_at, updated_at, tags, category_id, user_id
) ON public.marketplace_listings TO anon;

-- 2) Realtime channel authorization for marketplace threads/messages.
-- Restrict subscriptions on realtime.messages to participants of the topic.
-- Topic convention used by client: 'mp_thread:<thread_id>' and 'mp_messages:<thread_id>'
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated can read realtime if participant" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime if participant"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow only when the topic refers to a thread the user participates in.
  CASE
    WHEN realtime.topic() LIKE 'mp_thread:%' OR realtime.topic() LIKE 'mp_messages:%' THEN
      public.is_mp_thread_participant(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
      )
    WHEN realtime.topic() LIKE 'dm_thread:%' OR realtime.topic() LIKE 'dm_messages:%' THEN
      public.is_thread_participant(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
      )
    ELSE false
  END
);

DROP POLICY IF EXISTS "Authenticated can broadcast if participant" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast if participant"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'mp_thread:%' OR realtime.topic() LIKE 'mp_messages:%' THEN
      public.is_mp_thread_participant(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
      )
    WHEN realtime.topic() LIKE 'dm_thread:%' OR realtime.topic() LIKE 'dm_messages:%' THEN
      public.is_thread_participant(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
      )
    ELSE false
  END
);
