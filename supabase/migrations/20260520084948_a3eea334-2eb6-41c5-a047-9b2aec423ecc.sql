
-- 1. saved_searches table
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  query text,
  city text,
  category_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.saved_searches enable row level security;
create policy "Users view own saved searches" on public.saved_searches for select using (auth.uid() = user_id);
create policy "Users insert own saved searches" on public.saved_searches for insert with check (auth.uid() = user_id);
create policy "Users update own saved searches" on public.saved_searches for update using (auth.uid() = user_id);
create policy "Users delete own saved searches" on public.saved_searches for delete using (auth.uid() = user_id);
create trigger saved_searches_updated_at before update on public.saved_searches for each row execute function public.set_updated_at();

-- 2. avatars bucket
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
create policy "Avatars are publicly readable" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own avatar" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- 3. owner role
alter type public.app_role add value if not exists 'owner';
