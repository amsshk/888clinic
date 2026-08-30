ALTER TABLE public.scan_wallets ALTER COLUMN free_scans_remaining SET DEFAULT 1;

CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scan_wallets (user_id, free_scans_remaining, credits)
  VALUES (NEW.id, 1, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_wallet() FROM PUBLIC;

UPDATE public.scan_wallets SET free_scans_remaining = 1, updated_at = now()
WHERE free_scans_remaining > 1;