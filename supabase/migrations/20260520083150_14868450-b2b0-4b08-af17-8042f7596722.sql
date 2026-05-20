-- Allow anon and authenticated to execute has_role (used in RLS policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;