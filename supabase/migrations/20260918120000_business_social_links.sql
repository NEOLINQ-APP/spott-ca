-- Businesses had a generic `website` field but no way to link a
-- Facebook/Instagram/LinkedIn presence, even though the public business
-- page already renders a "Website" link when set. Same pattern: nullable
-- URL columns, no RLS change needed (existing owner/admin UPDATE policy
-- already covers any column on the row) -- the application-layer
-- whitelist in updateBusinessContact() is what actually gates writes.

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS linkedin_url text;
