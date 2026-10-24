-- Staff (not only admins) may add and change product photos.
-- Prices, availability and deleting products remain admin-only.
create policy "Staff manage catalog product images"
  on public.catalog_product_images for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
