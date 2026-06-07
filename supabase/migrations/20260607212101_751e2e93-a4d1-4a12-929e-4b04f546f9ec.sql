-- RLS policies for company-catalogs (owner write, authenticated read)
CREATE POLICY "company-catalogs read auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-catalogs');

CREATE POLICY "company-catalogs owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "company-catalogs owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "company-catalogs owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-catalogs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for rfq-attachments (owner write, authenticated read)
CREATE POLICY "rfq-attachments read auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'rfq-attachments');

CREATE POLICY "rfq-attachments owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rfq-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "rfq-attachments owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rfq-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "rfq-attachments owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'rfq-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);