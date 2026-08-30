ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS show_in_results boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS results_category text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;