
create extension if not exists pg_trgm;

-- New columns on businesses for dedup + provenance
alter table public.businesses
  add column if not exists phone_normalized text,
  add column if not exists website_host text,
  add column if not exists source text,
  add column if not exists source_ref text,
  add column if not exists import_confidence numeric;

create index if not exists idx_businesses_phone_normalized on public.businesses(phone_normalized) where phone_normalized is not null;
create index if not exists idx_businesses_website_host on public.businesses(website_host) where website_host is not null;
create index if not exists idx_businesses_source_ref on public.businesses(source, source_ref) where source_ref is not null;
create index if not exists idx_businesses_latlng on public.businesses(latitude, longitude) where latitude is not null;
create index if not exists idx_businesses_name_trgm on public.businesses using gin (name gin_trgm_ops);

-- Import sources registry
create table if not exists public.import_sources (
  id uuid primary key default gen_random_uuid(),
  source text not null,                  -- e.g. 'osm'
  city text not null,
  province text not null,
  category_slug text,                    -- maps to public.categories.slug
  osm_filter text,                       -- e.g. 'amenity=restaurant' or 'shop=car_repair'
  enabled boolean not null default true,
  last_run_at timestamptz,
  last_imported_count integer,
  created_at timestamptz not null default now()
);

alter table public.import_sources enable row level security;

create policy "Admins manage import_sources"
  on public.import_sources for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Service role manages import_sources"
  on public.import_sources for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Staging table for imported businesses
create table if not exists public.imported_businesses (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_ref text not null,              -- external id (e.g. osm node/way id)
  raw jsonb not null,                    -- original fetched payload
  name text not null,
  address text,
  city text,
  province text,
  postal_code text,
  phone text,
  phone_normalized text,
  website text,
  website_host text,
  email text,
  latitude numeric,
  longitude numeric,
  hours jsonb,
  social_links jsonb default '{}'::jsonb,
  keywords text[] default '{}',
  ai_description text,
  category_slug text,
  category_id uuid,
  confidence numeric default 0,          -- 0..1
  dedup_match_business_id uuid,
  dedup_reason text,
  status text not null default 'pending', -- pending|approved|rejected|duplicate|promoted
  promoted_business_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_ref)
);

create index if not exists idx_imported_status on public.imported_businesses(status);
create index if not exists idx_imported_city on public.imported_businesses(city);
create index if not exists idx_imported_phone on public.imported_businesses(phone_normalized) where phone_normalized is not null;
create index if not exists idx_imported_website on public.imported_businesses(website_host) where website_host is not null;
create index if not exists idx_imported_name_trgm on public.imported_businesses using gin (name gin_trgm_ops);

alter table public.imported_businesses enable row level security;

create policy "Admins manage imported_businesses"
  on public.imported_businesses for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Service role manages imported_businesses"
  on public.imported_businesses for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create trigger set_imported_updated_at
  before update on public.imported_businesses
  for each row execute function public.set_updated_at();

-- Seed initial Alberta sources
insert into public.import_sources (source, city, province, category_slug, osm_filter)
values
  ('osm','Edmonton','AB','restaurants-food','amenity=restaurant'),
  ('osm','Edmonton','AB','restaurants-food','amenity=cafe'),
  ('osm','Edmonton','AB','restaurants-food','amenity=fast_food'),
  ('osm','Edmonton','AB','automotive','shop=car_repair'),
  ('osm','Edmonton','AB','automotive','shop=car'),
  ('osm','Calgary','AB','restaurants-food','amenity=restaurant'),
  ('osm','Calgary','AB','restaurants-food','amenity=cafe'),
  ('osm','Calgary','AB','restaurants-food','amenity=fast_food'),
  ('osm','Calgary','AB','automotive','shop=car_repair'),
  ('osm','Calgary','AB','automotive','shop=car')
on conflict do nothing;
