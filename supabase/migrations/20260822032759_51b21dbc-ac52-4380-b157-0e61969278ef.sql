CREATE TABLE public.engine_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  allow_language_model_fallback BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.engine_settings TO authenticated;
GRANT ALL ON public.engine_settings TO service_role;

ALTER TABLE public.engine_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read engine settings"
ON public.engine_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.engine_settings (id, allow_language_model_fallback) VALUES ('default', false);