create extension if not exists vector;

create table public.face_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'scan',
  storage_path text,
  embedding vector(3072) not null,
  duplicate_of_user_id uuid references auth.users(id) on delete set null,
  similarity numeric,
  created_at timestamptz not null default now()
);

grant select on public.face_identities to authenticated;
grant all on public.face_identities to service_role;

alter table public.face_identities enable row level security;

create policy "Users view own face identity rows"
  on public.face_identities for select to authenticated
  using (user_id = auth.uid());

create policy "Staff view face identities"
  on public.face_identities for select to authenticated
  using (is_staff(auth.uid()));

create index face_identities_user_idx on public.face_identities (user_id);
create index face_identities_embedding_idx
  on public.face_identities using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

create or replace function public.match_face_identity(
  _embedding text,
  _exclude_user uuid,
  _threshold numeric default 0.90
)
returns table (matched_user_id uuid, similarity numeric)
language sql
stable
security definer
set search_path = public
as $$
  select f.user_id,
         max(1 - (f.embedding::halfvec(3072) <=> (_embedding::vector(3072))::halfvec(3072)))::numeric
  from public.face_identities f
  where f.user_id <> _exclude_user
  group by f.user_id
  having max(1 - (f.embedding::halfvec(3072) <=> (_embedding::vector(3072))::halfvec(3072))) >= _threshold
  order by 2 desc
  limit 1;
$$;

revoke all on function public.match_face_identity(text, uuid, numeric) from public;
revoke all on function public.match_face_identity(text, uuid, numeric) from anon;
revoke all on function public.match_face_identity(text, uuid, numeric) from authenticated;
grant execute on function public.match_face_identity(text, uuid, numeric) to service_role;

create table public.signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  email_domain text,
  created_at timestamptz not null default now()
);

grant all on public.signup_attempts to service_role;

alter table public.signup_attempts enable row level security;

create policy "Staff view signup attempts"
  on public.signup_attempts for select to authenticated
  using (is_staff(auth.uid()));

create index signup_attempts_ip_idx on public.signup_attempts (ip, created_at desc);