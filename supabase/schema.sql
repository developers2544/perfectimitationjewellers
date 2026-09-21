-- Perfect Imitation Jewellers: run this once in Supabase > SQL Editor > New query > Run.

-- 1. Site content (about, address, product names, uses and wholesale rates)
create table if not exists public.site_content (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Exclusive / trending items (fully managed from the admin page)
create table if not exists public.exclusive_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default '',
  note text default '',
  rate_min text default '',
  rate_max text default '',
  image_url text not null,
  image_path text not null,
  image2_url text default '',
  image2_path text default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
alter table public.exclusive_items enable row level security;

-- Everyone can read. Only a logged-in user (the owner) can write.
drop policy if exists "public read content" on public.site_content;
create policy "public read content" on public.site_content for select using (true);
drop policy if exists "owner write content" on public.site_content;
create policy "owner write content" on public.site_content for all to authenticated using (true) with check (true);

drop policy if exists "public read active items" on public.exclusive_items;
create policy "public read active items" on public.exclusive_items for select using (active = true or auth.role() = 'authenticated');
drop policy if exists "owner write items" on public.exclusive_items;
create policy "owner write items" on public.exclusive_items for all to authenticated using (true) with check (true);

-- 3. Public image bucket for exclusive items
insert into storage.buckets (id, name, public)
values ('exclusive', 'exclusive', true)
on conflict (id) do update set public = true;

drop policy if exists "public read exclusive images" on storage.objects;
create policy "public read exclusive images" on storage.objects for select using (bucket_id = 'exclusive');
drop policy if exists "owner upload exclusive images" on storage.objects;
create policy "owner upload exclusive images" on storage.objects for insert to authenticated with check (bucket_id = 'exclusive');
drop policy if exists "owner update exclusive images" on storage.objects;
create policy "owner update exclusive images" on storage.objects for update to authenticated using (bucket_id = 'exclusive');
drop policy if exists "owner delete exclusive images" on storage.objects;
create policy "owner delete exclusive images" on storage.objects for delete to authenticated using (bucket_id = 'exclusive');

-- 4. Starting row so the site has something to read
insert into public.site_content (id, data) values ('main', '{}'::jsonb) on conflict (id) do nothing;
