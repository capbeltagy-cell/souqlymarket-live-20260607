
-- Public read for marketplace media
CREATE POLICY "Public read listing-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-media');

CREATE POLICY "Public read company-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users upload to their own folder (first path segment = auth.uid())
CREATE POLICY "Authenticated upload listing-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated update own listing-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated delete own listing-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated upload company-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated update own company-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated delete own company-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
