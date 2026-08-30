CREATE TABLE public.access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email text,
  role text,
  granted boolean,
  credits_before integer,
  credits_after integer,
  free_before integer,
  free_after integer,
  actor_id uuid NOT NULL,
  actor_email text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_audit TO authenticated;
GRANT ALL ON public.access_audit TO service_role;

ALTER TABLE public.access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access audit"
ON public.access_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX access_audit_created_at_idx ON public.access_audit (created_at DESC);