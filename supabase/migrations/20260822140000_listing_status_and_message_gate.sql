-- Adds a real "Pending" listing status (Facebook Marketplace-style
-- Available/Pending/Sold) alongside the existing active/sold/hidden/removed,
-- and a real DB-level gate stopping a buyer from sending a second message
-- in a thread before the seller has replied to the first — enforced as a
-- trigger, not just a disabled button, so it can't be bypassed by calling
-- the insert directly.

ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_status_check;
ALTER TABLE public.marketplace_listings ADD CONSTRAINT marketplace_listings_status_check
  CHECK (status IN ('active', 'pending', 'sold', 'hidden', 'removed'));

CREATE OR REPLACE FUNCTION public.enforce_mp_buyer_reply_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_row public.mp_threads%ROWTYPE;
  last_sender uuid;
BEGIN
  SELECT * INTO thread_row FROM public.mp_threads WHERE id = NEW.thread_id;

  IF NEW.sender_id = thread_row.buyer_id THEN
    SELECT sender_id INTO last_sender
    FROM public.mp_messages
    WHERE thread_id = NEW.thread_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_sender IS NOT NULL AND last_sender = thread_row.buyer_id THEN
      RAISE EXCEPTION 'Wait for the seller to reply before sending another message.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mp_messages_buyer_reply_gate ON public.mp_messages;
CREATE TRIGGER mp_messages_buyer_reply_gate
  BEFORE INSERT ON public.mp_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mp_buyer_reply_gate();
