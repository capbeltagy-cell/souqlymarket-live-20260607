-- Allow authenticated and anon users to see storage buckets metadata.
-- Without this, supabase-js returns "Bucket not found" on uploads even when
-- storage.objects policies are correct, because the client must first resolve
-- the bucket row.
CREATE POLICY "Public can read bucket metadata"
  ON storage.buckets FOR SELECT
  TO anon, authenticated
  USING (true);