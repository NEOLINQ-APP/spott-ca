
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'business' then
    insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
  end if;
  return new;
end;
$function$;
