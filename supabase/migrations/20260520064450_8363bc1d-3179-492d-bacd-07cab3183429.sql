
-- 1. addon_purchases
create table if not exists public.addon_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  business_id uuid references public.businesses(id) on delete cascade,
  addon_type text not null,
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  amount_cents integer,
  currency text,
  status text not null default 'completed',
  environment text not null default 'sandbox',
  applied_at timestamptz default now(),
  expires_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_addon_purchases_user on public.addon_purchases(user_id);
create index if not exists idx_addon_purchases_business on public.addon_purchases(business_id);

alter table public.addon_purchases enable row level security;

create policy "Owners view own addon purchases"
  on public.addon_purchases for select
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "Service role manages addon purchases"
  on public.addon_purchases for all
  using (auth.role() = 'service_role');

-- 2. Business boost columns
alter table public.businesses
  add column if not exists featured_until timestamptz,
  add column if not exists bumped_until timestamptz,
  add column if not exists photo_pack_bonus integer not null default 0;

create index if not exists idx_businesses_featured_until on public.businesses(featured_until) where featured_until is not null;
create index if not exists idx_businesses_bumped_until on public.businesses(bumped_until) where bumped_until is not null;

-- 3. Fix has_active_subscription default to 'live'
create or replace function public.has_active_subscription(user_uuid uuid, check_env text default 'live')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
      and environment = check_env
      and (
        (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$$;

create or replace function public.get_active_price_id(user_uuid uuid, check_env text default 'live')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select price_id from public.subscriptions
  where user_id = user_uuid
    and environment = check_env
    and (
      (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
      or (status = 'canceled' and current_period_end > now())
    )
  order by created_at desc
  limit 1
$$;
