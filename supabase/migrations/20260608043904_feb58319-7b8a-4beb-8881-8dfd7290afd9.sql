
-- Restrict marketplace_listings contact fields from public/auth client reads
REVOKE SELECT (contact_email, contact_phone) ON public.marketplace_listings FROM anon;
REVOKE SELECT (contact_email, contact_phone) ON public.marketplace_listings FROM authenticated;
GRANT SELECT (contact_email, contact_phone) ON public.marketplace_listings TO service_role;

-- Remove broad seller raw-row access on marketplace_orders.
-- Seller order reads are served via server functions using the service role,
-- which return only fulfillment-safe fields. Admins retain access via has_role.
DROP POLICY IF EXISTS "Sellers view orders for their items" ON public.marketplace_orders;
