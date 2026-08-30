CREATE TABLE public.mali_models (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  storage_path text not null,
  notes text,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.mali_models TO authenticated;
GRANT ALL ON public.mali_models TO service_role;
ALTER TABLE public.mali_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active model" ON public.mali_models
FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage models" ON public.mali_models
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX mali_models_single_active ON public.mali_models (is_active) WHERE is_active;

CREATE POLICY "Admins manage model files" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'models' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'models' AND public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.skin_scans ADD COLUMN IF NOT EXISTS mali_nevus_prob numeric;
ALTER TABLE public.skin_scans ADD COLUMN IF NOT EXISTS mali_primary boolean not null default false;