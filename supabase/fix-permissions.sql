-- Run this in Supabase > SQL Editor if saving or photo upload shows a permission error.
-- Safe to run more than once.

grant usage on schema public to anon, authenticated;
grant select on public.site_content, public.exclusive_items to anon, authenticated;
grant insert, update, delete on public.site_content, public.exclusive_items to authenticated;

alter table public.site_content enable row level security;
alter table public.exclusive_items enable row level security;

drop policy if exists "public read content" on public.site_content;
create policy "public read content" on public.site_content for select using (true);
drop policy if exists "owner write content" on public.site_content;
create policy "owner write content" on public.site_content for all to authenticated using (true) with check (true);

drop policy if exists "public read active items" on public.exclusive_items;
create policy "public read active items" on public.exclusive_items for select using (active = true or auth.role() = 'authenticated');
drop policy if exists "owner write items" on public.exclusive_items;
create policy "owner write items" on public.exclusive_items for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('exclusive', 'exclusive', true)
on conflict (id) do update set public = true;

drop policy if exists "public read exclusive images" on storage.objects;
create policy "public read exclusive images" on storage.objects for select using (bucket_id = 'exclusive');
drop policy if exists "owner upload exclusive images" on storage.objects;
create policy "owner upload exclusive images" on storage.objects for insert to authenticated with check (bucket_id = 'exclusive');
drop policy if exists "owner update exclusive images" on storage.objects;
create policy "owner update exclusive images" on storage.objects for update to authenticated using (bucket_id = 'exclusive') with check (bucket_id = 'exclusive');
drop policy if exists "owner delete exclusive images" on storage.objects;
create policy "owner delete exclusive images" on storage.objects for delete to authenticated using (bucket_id = 'exclusive');

insert into public.site_content (id, data) values ('main', '{}'::jsonb) on conflict (id) do nothing;
