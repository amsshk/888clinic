CREATE TABLE public.scan_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  free_scans_remaining integer NOT NULL DEFAULT 2 CHECK (free_scans_remaining >= 0),
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scan_wallets TO authenticated;
GRANT ALL ON public.scan_wallets TO service_role;
ALTER TABLE public.scan_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet"
ON public.scan_wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view wallets"
ON public.scan_wallets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.skin_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  body_area text,
  concern text,
  status text NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'failed')),
  condition text,
  confidence numeric,
  severity text,
  summary text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  urgency text,
  charged text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.skin_scans TO authenticated;
GRANT ALL ON public.skin_scans TO service_role;
ALTER TABLE public.skin_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scans"
ON public.skin_scans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own scans"
ON public.skin_scans FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all scans"
ON public.skin_scans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX skin_scans_user_created_idx ON public.skin_scans (user_id, created_at DESC);

CREATE TABLE public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  amount_thb integer NOT NULL CHECK (amount_thb >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider text NOT NULL DEFAULT 'stripe',
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
ON public.credit_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all purchases"
ON public.credit_purchases FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scan_wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_wallet() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created_wallet
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

INSERT INTO public.scan_wallets (user_id)
SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.consume_scan_credit(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used text;
BEGIN
  INSERT INTO public.scan_wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.scan_wallets
  SET free_scans_remaining = free_scans_remaining - 1, updated_at = now()
  WHERE user_id = _user_id AND free_scans_remaining > 0
  RETURNING 'free' INTO used;

  IF used IS NOT NULL THEN
    RETURN used;
  END IF;

  UPDATE public.scan_wallets
  SET credits = credits - 1, updated_at = now()
  WHERE user_id = _user_id AND credits > 0
  RETURNING 'credit' INTO used;

  RETURN used;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_scan_credit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_scan_credit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_scan_credit(_user_id uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _kind = 'free' THEN
    UPDATE public.scan_wallets SET free_scans_remaining = free_scans_remaining + 1, updated_at = now()
    WHERE user_id = _user_id;
  ELSIF _kind = 'credit' THEN
    UPDATE public.scan_wallets SET credits = credits + 1, updated_at = now()
    WHERE user_id = _user_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refund_scan_credit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_scan_credit(uuid, text) TO service_role;

CREATE POLICY "Users read own scan files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'scans' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

CREATE POLICY "Users upload own scan files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scans' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own scan files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'scans' AND (storage.foldername(name))[1] = auth.uid()::text);