
create table public.user_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  friend_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.user_friends enable row level security;

create policy "Friends viewable by all"
  on public.user_friends for select
  using (true);

create policy "Users add own friends"
  on public.user_friends for insert
  with check (auth.uid() = user_id);

create policy "Users remove own friends"
  on public.user_friends for delete
  using (auth.uid() = user_id);

create index user_friends_user_idx on public.user_friends(user_id);
create index user_friends_friend_idx on public.user_friends(friend_id);
