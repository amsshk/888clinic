alter table public.media_items
  add column if not exists show_in_catalogue boolean not null default false,
  add column if not exists catalogue_brand text,
  add column if not exists catalogue_section text;
create index if not exists media_items_show_in_catalogue_idx
  on public.media_items (show_in_catalogue, published, sort_order);
create index if not exists media_items_catalogue_brand_idx
  on public.media_items (catalogue_brand);
create index if not exists media_items_catalogue_section_idx
  on public.media_items (catalogue_section);
