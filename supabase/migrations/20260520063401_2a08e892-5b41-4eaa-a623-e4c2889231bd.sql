-- Subscriptions table (Stripe-driven)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_id on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "Users view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role manages subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

create or replace function public.has_active_subscription(
  user_uuid uuid,
  check_env text default 'sandbox'
)
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

create or replace function public.get_active_price_id(
  user_uuid uuid,
  check_env text default 'sandbox'
)
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

create trigger trg_subscriptions_updated
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Specials / coupons
create table public.specials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  title text not null,
  description text,
  discount_label text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_specials_business on public.specials(business_id);
create index idx_specials_active on public.specials(is_active, ends_at);

alter table public.specials enable row level security;

create policy "Active specials viewable by all"
  on public.specials for select
  using (
    is_active = true and (ends_at is null or ends_at > now())
    or exists (select 1 from public.businesses b where b.id = specials.business_id and b.owner_id = auth.uid())
    or has_role(auth.uid(), 'admin')
  );

create policy "Owners insert own specials"
  on public.specials for insert
  with check (
    exists (select 1 from public.businesses b where b.id = specials.business_id and b.owner_id = auth.uid())
  );

create policy "Owners update own specials"
  on public.specials for update
  using (
    exists (select 1 from public.businesses b where b.id = specials.business_id and b.owner_id = auth.uid())
    or has_role(auth.uid(), 'admin')
  );

create policy "Owners delete own specials"
  on public.specials for delete
  using (
    exists (select 1 from public.businesses b where b.id = specials.business_id and b.owner_id = auth.uid())
    or has_role(auth.uid(), 'admin')
  );

create trigger trg_specials_updated
before update on public.specials
for each row execute function public.set_updated_at();

-- Search history
create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  query text not null,
  category_slug text,
  city text,
  created_at timestamptz not null default now()
);
create index idx_search_history_user on public.search_history(user_id, created_at desc);

alter table public.search_history enable row level security;

create policy "Users view own search history"
  on public.search_history for select
  using (auth.uid() = user_id);

create policy "Users insert own search history"
  on public.search_history for insert
  with check (auth.uid() = user_id);

create policy "Users delete own search history"
  on public.search_history for delete
  using (auth.uid() = user_id);

-- Geo + address fields on businesses for maps
alter table public.businesses
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists postal_code text;