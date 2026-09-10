create table if not exists public.catalog_product_images (
  product_id text primary key,
  kind text not null check (kind in ('filler', 'skincare')),
  original_path text,
  final_path text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.catalog_product_images enable row level security;

grant select on public.catalog_product_images to anon, authenticated;
grant insert, update, delete on public.catalog_product_images to authenticated;
grant all on public.catalog_product_images to service_role;

create policy "Anyone can read catalog product images"
  on public.catalog_product_images for select to anon, authenticated
  using (true);

create policy "Admins manage catalog product images"
  on public.catalog_product_images for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
