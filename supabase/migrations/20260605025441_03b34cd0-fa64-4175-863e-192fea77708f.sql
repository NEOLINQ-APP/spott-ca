
REVOKE SELECT (contact_email, contact_phone, contact_pref) ON public.profiles FROM anon;
REVOKE SELECT (contact_email, contact_phone, contact_pref) ON public.profiles FROM authenticated;
REVOKE UPDATE (contact_email, contact_phone, contact_pref) ON public.profiles FROM anon;
REVOKE UPDATE (contact_email, contact_phone, contact_pref) ON public.profiles FROM authenticated;
