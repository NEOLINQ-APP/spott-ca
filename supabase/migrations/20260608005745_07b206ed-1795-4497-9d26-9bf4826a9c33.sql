
-- Category enum
CREATE TYPE public.subscriber_category AS ENUM (
  'individual',
  'business',
  'dealership',
  'realtor',
  'service_provider',
  'employer',
  'influencer',
  'podcaster',
  'event_organizer'
);

CREATE TABLE public.subscriber_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email citext NOT NULL UNIQUE,
  display_name text,
  category public.subscriber_category NOT NULL DEFAULT 'individual',
  province text,
  city text,
  interests text[] NOT NULL DEFAULT '{}',
  membership_type text NOT NULL DEFAULT 'free',
  subscribed boolean NOT NULL DEFAULT true,
  source text,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriber_profiles_category ON public.subscriber_profiles(category);
CREATE INDEX idx_subscriber_profiles_province ON public.subscriber_profiles(province);
CREATE INDEX idx_subscriber_profiles_city ON public.subscriber_profiles(city);
CREATE INDEX idx_subscriber_profiles_subscribed ON public.subscriber_profiles(subscribed);
CREATE INDEX idx_subscriber_profiles_interests ON public.subscriber_profiles USING gin(interests);
CREATE INDEX idx_subscriber_profiles_user_id ON public.subscriber_profiles(user_id);

GRANT SELECT, INSERT, UPDATE ON public.subscriber_profiles TO authenticated;
GRANT INSERT ON public.subscriber_profiles TO anon;
GRANT ALL ON public.subscriber_profiles TO service_role;

ALTER TABLE public.subscriber_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe"
  ON public.subscriber_profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Subscribers can view their own row (by user_id) or admins can view all
CREATE POLICY "Users view their subscription or admins view all"
  ON public.subscriber_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Subscribers update their own row (by user_id) or admins update all
CREATE POLICY "Users update their subscription or admins update all"
  ON public.subscriber_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins delete subscriptions"
  ON public.subscriber_profiles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriber_profiles_updated_at
  BEFORE UPDATE ON public.subscriber_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Unsubscribe RPC by token (callable anonymously)
CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.subscriber_profiles
  SET subscribed = false, unsubscribed_at = now()
  WHERE unsubscribe_token = _token AND subscribed = true;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(uuid) TO anon, authenticated;
