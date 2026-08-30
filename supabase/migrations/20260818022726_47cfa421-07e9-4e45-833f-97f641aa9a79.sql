ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS service text,
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';