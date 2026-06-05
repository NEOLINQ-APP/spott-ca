CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username citext UNIQUE,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_pref text NOT NULL DEFAULT 'chat';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_contact_pref_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_contact_pref_check
  CHECK (contact_pref IN ('email','chat','phone'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (username IS NULL OR (length(username::text) BETWEEN 3 AND 24 AND username::text ~ '^[a-zA-Z0-9_]+$'));

-- Backfill usernames for existing rows
UPDATE public.profiles
  SET username = 'user_' || substr(replace(id::text,'-',''),1,10)
  WHERE username IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update signup trigger to auto-assign username
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'));
  if base is null or length(base) < 3 then base := 'user'; end if;
  if length(base) > 18 then base := substr(base, 1, 18); end if;
  candidate := base;
  while exists(select 1 from public.profiles where username = candidate::citext) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, display_name, avatar_url, username, contact_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    candidate,
    new.email
  );
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'business' then
    insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
  end if;
  return new;
end;
$function$;