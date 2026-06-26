
CREATE OR REPLACE FUNCTION public.increment_sparq_usage(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sparq_workspaces
  SET
    month_anchor = CASE
      WHEN month_anchor < date_trunc('month', now())::date THEN date_trunc('month', now())::date
      ELSE month_anchor
    END,
    messages_this_month = CASE
      WHEN month_anchor < date_trunc('month', now())::date THEN 1
      ELSE messages_this_month + 1
    END
  WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sparq_usage(uuid) TO anon, authenticated, service_role;
