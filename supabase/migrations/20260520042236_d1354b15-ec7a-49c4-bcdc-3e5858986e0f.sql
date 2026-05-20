
-- Roles enum
create type public.app_role as enum ('admin', 'business_owner', 'customer');

-- Business status enum
create type public.business_status as enum ('pending', 'approved', 'rejected');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view own roles"
  on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles"
  on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text,
  sort_order int not null default 0
);
alter table public.categories enable row level security;
create policy "Categories viewable by all"
  on public.categories for select using (true);
create policy "Admins manage categories"
  on public.categories for all using (public.has_role(auth.uid(), 'admin'));

insert into public.categories (slug, name, icon, sort_order) values
  ('restaurants-food', 'Restaurants & Food', 'UtensilsCrossed', 1),
  ('beauty-personal-care', 'Beauty & Personal Care', 'Scissors', 2),
  ('health-wellness', 'Health & Wellness', 'HeartPulse', 3),
  ('home-services', 'Home Services', 'Wrench', 4),
  ('automotive', 'Automotive', 'Car', 5),
  ('professional-services', 'Professional Services', 'Briefcase', 6),
  ('shopping-retail', 'Shopping & Retail', 'ShoppingBag', 7),
  ('events-entertainment', 'Events & Entertainment', 'PartyPopper', 8);

-- Businesses
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  city text,
  province text default 'ON',
  address text,
  phone text,
  website text,
  hero_image_url text,
  status public.business_status not null default 'pending',
  is_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.businesses enable row level security;

create policy "Approved businesses viewable by all"
  on public.businesses for select
  using (status = 'approved' or owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Authenticated users can create businesses"
  on public.businesses for insert
  with check (auth.uid() is not null);
create policy "Owners and admins can update"
  on public.businesses for update
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete"
  on public.businesses for delete
  using (public.has_role(auth.uid(), 'admin'));

create index on public.businesses (category_id);
create index on public.businesses (status);
create index on public.businesses (city);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile + customer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
