ALTER TABLE public.skin_scans
  ADD COLUMN IF NOT EXISTS mali_melanoma_prob NUMERIC,
  ADD COLUMN IF NOT EXISTS mali_sk_prob NUMERIC,
  ADD COLUMN IF NOT EXISTS mali_model_version TEXT;