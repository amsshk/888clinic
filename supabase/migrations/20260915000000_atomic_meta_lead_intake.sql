create table if not exists public.meta_lead_deliveries (
  lead_id text primary key check (char_length(lead_id) between 1 and 160),
  form_id text not null check (char_length(form_id) between 1 and 160),
  platform text not null check (platform in ('facebook', 'instagram')),
  meta_created_at timestamptz not null,
  enquiry_id uuid,
  received_at timestamptz not null default now()
);

alter table public.meta_lead_deliveries enable row level security;

create or replace function public.ingest_meta_lead(
  _lead_id text,
  _form_id text,
  _platform text,
  _created_time timestamptz,
  _full_name text,
  _phone text,
  _email text,
  _clinic_branch text,
  _service text,
  _campaign text
)
returns table (duplicate boolean, enquiry_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_enquiry_id uuid;
  created_enquiry_id uuid;
begin
  select d.enquiry_id into existing_enquiry_id
  from public.meta_lead_deliveries d
  where d.lead_id = _lead_id;

  if found then
    return query select true, existing_enquiry_id;
    return;
  end if;

  insert into public.meta_lead_deliveries (
    lead_id,
    form_id,
    platform,
    meta_created_at
  )
  values (
    _lead_id,
    _form_id,
    _platform,
    _created_time
  )
  on conflict (lead_id) do nothing;

  if not found then
    select d.enquiry_id into existing_enquiry_id
    from public.meta_lead_deliveries d
    where d.lead_id = _lead_id;

    return query select true, existing_enquiry_id;
    return;
  end if;

  insert into public.enquiries (
    full_name,
    phone,
    email,
    service,
    clinic_branch,
    source,
    utm_source,
    utm_medium,
    utm_campaign
  )
  values (
    _full_name,
    _phone,
    _email,
    nullif(_service, ''),
    _clinic_branch,
    _platform,
    _platform,
    'paid-social',
    nullif(_campaign, '')
  )
  returning id into created_enquiry_id;

  update public.meta_lead_deliveries
  set enquiry_id = created_enquiry_id
  where lead_id = _lead_id;

  return query select false, created_enquiry_id;
end;
$$;

revoke all on function public.ingest_meta_lead(
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.ingest_meta_lead(
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
