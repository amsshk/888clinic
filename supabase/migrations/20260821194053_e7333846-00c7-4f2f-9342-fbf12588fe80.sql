DROP POLICY IF EXISTS "Anyone can view available catalog items" ON public.catalog_items;

CREATE POLICY "Anyone can view catalog items"
  ON public.catalog_items FOR SELECT TO anon, authenticated
  USING (true);