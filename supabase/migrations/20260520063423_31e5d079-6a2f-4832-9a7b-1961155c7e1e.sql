revoke execute on function public.has_active_subscription(uuid, text) from public, anon;
revoke execute on function public.get_active_price_id(uuid, text) from public, anon;
grant execute on function public.has_active_subscription(uuid, text) to authenticated;
grant execute on function public.get_active_price_id(uuid, text) to authenticated;