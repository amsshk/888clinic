CREATE TABLE public.copy_overrides (
  copy_key TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en','th')),
  value TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (copy_key, lang)
);

GRANT SELECT ON public.copy_overrides TO anon;
GRANT SELECT ON public.copy_overrides TO authenticated;
GRANT ALL ON public.copy_overrides TO service_role;

ALTER TABLE public.copy_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site copy" ON public.copy_overrides FOR SELECT USING (true);
CREATE POLICY "Admins manage site copy" ON public.copy_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));