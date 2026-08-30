CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hn text,
  full_name text NOT NULL,
  nickname text,
  age integer,
  phone text,
  phone_digits text GENERATED ALWAYS AS (regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) STORED,
  address text,
  first_visit text,
  treatment_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view patients" ON public.patients FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update patients" ON public.patients FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete patients" ON public.patients FOR DELETE TO authenticated USING (is_staff(auth.uid()));

CREATE UNIQUE INDEX patients_hn_key ON public.patients (hn) WHERE hn IS NOT NULL;
CREATE INDEX patients_phone_digits_idx ON public.patients (phone_digits);
CREATE INDEX patients_full_name_idx ON public.patients (full_name);

CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();