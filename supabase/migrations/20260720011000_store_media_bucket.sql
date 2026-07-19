-- Public media bucket for store logos and banners.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-media',
  'store-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Each authenticated user owns only the files under their user-id folder.
drop policy if exists "Store media public read" on storage.objects;
create policy "Store media public read"
on storage.objects for select
to public
using (bucket_id = 'store-media');

drop policy if exists "Store owners upload media" on storage.objects;
create policy "Store owners upload media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'store-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.companies c where c.owner_id = auth.uid()
  )
);

drop policy if exists "Store owners update media" on storage.objects;
create policy "Store owners update media"
on storage.objects for update
to authenticated
using (bucket_id = 'store-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'store-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Store owners delete media" on storage.objects;
create policy "Store owners delete media"
on storage.objects for delete
to authenticated
using (bucket_id = 'store-media' and (storage.foldername(name))[1] = auth.uid()::text);
