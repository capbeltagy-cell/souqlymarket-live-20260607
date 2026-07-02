
-- 1) Tenders: require authentication to view
DROP POLICY IF EXISTS "tenders public read" ON public.tenders;
CREATE POLICY "tenders authenticated read"
  ON public.tenders FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.tenders FROM anon;

-- 2) Companies: explicitly revoke sensitive columns from anon (defense-in-depth; column grants already exclude these)
REVOKE SELECT (email, phone, website) ON public.companies FROM anon;

-- 3) Audit logs: prevent USING/WITH CHECK true
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4) RFQ attachments: align folder convention (folder = rfq id)
DROP POLICY IF EXISTS "rfq-attachments owner write" ON storage.objects;
DROP POLICY IF EXISTS "rfq-attachments owner update" ON storage.objects;
DROP POLICY IF EXISTS "rfq-attachments owner delete" ON storage.objects;
DROP POLICY IF EXISTS "rfq-attachments stakeholder read" ON storage.objects;

CREATE POLICY "rfq-attachments buyer write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'rfq-attachments'
    AND EXISTS (
      SELECT 1 FROM public.rfqs r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.buyer_id = auth.uid()
    )
  );

CREATE POLICY "rfq-attachments buyer update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND EXISTS (
      SELECT 1 FROM public.rfqs r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.buyer_id = auth.uid()
    )
  );

CREATE POLICY "rfq-attachments buyer delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND EXISTS (
      SELECT 1 FROM public.rfqs r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.buyer_id = auth.uid()
    )
  );

CREATE POLICY "rfq-attachments stakeholder read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.rfqs r
        WHERE r.id::text = (storage.foldername(name))[1]
          AND (
            r.buyer_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.rfq_offers o
              JOIN public.companies c ON c.id = o.company_id
              WHERE o.rfq_id = r.id AND c.owner_id = auth.uid()
            )
          )
      )
    )
  );
