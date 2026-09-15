create table if not exists public.medical_video_projects (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  format text not null default 'vertical' check (format in ('vertical', 'square', 'landscape')),
  status text not null default 'draft'
    check (status in ('draft', 'generating_clips', 'generating_narration', 'rendering', 'ready', 'failed')),
  script text not null default '',
  scenes jsonb not null default '[]'::jsonb,
  clip_jobs jsonb not null default '[]'::jsonb,
  narration_segments jsonb not null default '[]'::jsonb,
  subtitle_cues jsonb not null default '[]'::jsonb,
  final_video_path text,
  final_video_duration_seconds integer not null default 48,
  error_message text,
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medical_video_projects_created_by_idx
  on public.medical_video_projects (created_by, created_at desc);

create index if not exists medical_video_projects_status_idx
  on public.medical_video_projects (status, created_at desc);

alter table public.medical_video_projects enable row level security;

grant select on public.medical_video_projects to authenticated;
grant insert, update, delete on public.medical_video_projects to authenticated;
grant all on public.medical_video_projects to service_role;

create policy "Admins manage medical video projects"
  on public.medical_video_projects for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

