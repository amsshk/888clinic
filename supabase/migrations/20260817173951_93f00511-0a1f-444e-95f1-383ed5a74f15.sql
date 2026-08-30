CREATE POLICY "Anyone can read media files"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'media');

CREATE POLICY "Staff can upload media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update media files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete media files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND public.is_staff(auth.uid()));