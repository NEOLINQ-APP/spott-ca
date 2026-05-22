
-- Storage bucket
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

-- Storage policies (scoped to this bucket)
create policy "business-photos public read"
  on storage.objects for select
  using (bucket_id = 'business-photos');

create policy "business-photos owner upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "business-photos owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "business-photos owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Gallery table
create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_photos_business_idx on public.business_photos(business_id, sort_order);

alter table public.business_photos enable row level security;

create policy "business_photos viewable by all"
  on public.business_photos for select
  using (true);

create policy "business_photos owner insert"
  on public.business_photos for insert
  with check (
    exists (select 1 from public.businesses b
      where b.id = business_photos.business_id
        and (b.owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role)))
  );

create policy "business_photos owner update"
  on public.business_photos for update
  using (
    exists (select 1 from public.businesses b
      where b.id = business_photos.business_id
        and (b.owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role)))
  );

create policy "business_photos owner delete"
  on public.business_photos for delete
  using (
    exists (select 1 from public.businesses b
      where b.id = business_photos.business_id
        and (b.owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role)))
  );
