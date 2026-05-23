
ALTER FUNCTION public.protect_business_claims_columns() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.protect_business_claims_columns() FROM PUBLIC, anon, authenticated;
