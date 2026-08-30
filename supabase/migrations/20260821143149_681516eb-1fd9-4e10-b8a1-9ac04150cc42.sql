CREATE TABLE public.patient_report_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_hn text,
  patient_name text NOT NULL,
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL CHECK (action IN ('open','download','print')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX patient_report_audit_created_at_idx ON public.patient_report_audit (created_at DESC);
CREATE INDEX patient_report_audit_patient_idx ON public.patient_report_audit (patient_id);

GRANT SELECT ON public.patient_report_audit TO authenticated;
GRANT ALL ON public.patient_report_audit TO service_role;

ALTER TABLE public.patient_report_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view patient report audit"
ON public.patient_report_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));