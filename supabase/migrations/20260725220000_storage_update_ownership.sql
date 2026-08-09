-- Prevent authenticated users from moving an object they own into another
-- user's or company's namespace during an UPDATE operation.
--
-- PostgreSQL evaluates USING against the old row and WITH CHECK against the
-- new row. Both predicates are required for ownership-safe Storage updates.

BEGIN;

DROP POLICY IF EXISTS "Authenticated update own listing-media" ON storage.objects;
CREATE POLICY "Authenticated update own listing-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'listing-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'listing-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated update own company-assets" ON storage.objects;
CREATE POLICY "Authenticated update own company-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated update own avatars" ON storage.objects;
CREATE POLICY "Authenticated update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "company-catalogs owner update" ON storage.objects;
CREATE POLICY "company-catalogs owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-catalogs'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'company-catalogs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "rfq-attachments buyer update" ON storage.objects;
CREATE POLICY "rfq-attachments buyer update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'rfq-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.rfqs r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.buyer_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'rfq-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.rfqs r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.buyer_id = auth.uid()
  )
);

COMMIT;
