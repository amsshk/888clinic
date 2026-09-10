create table if not exists public.catalogue_design_settings (
  id integer primary key default 1 check (id = 1),
  preset text not null default 'charcoal-gold' check (preset in ('charcoal-gold', 'cream-studio', 'pearl-white', 'midnight-gold')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.catalogue_design_settings (id, preset)
values (1, 'charcoal-gold')
on conflict (id) do nothing;

alter table public.catalogue_design_settings enable row level security;

grant select on public.catalogue_design_settings to anon, authenticated;
grant insert, update, delete on public.catalogue_design_settings to authenticated;
grant all on public.catalogue_design_settings to service_role;

create policy "Anyone can read catalogue design"
  on public.catalogue_design_settings for select to anon, authenticated
  using (true);

create policy "Admins manage catalogue design"
  on public.catalogue_design_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));