CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_purchases_provider_ref
  ON public.credit_purchases (provider_ref)
  WHERE provider_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_credit_purchase(
  _user_id uuid,
  _credits integer,
  _amount_thb integer,
  _provider_ref text,
  _provider text DEFAULT 'stripe'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted boolean;
BEGIN
  INSERT INTO public.credit_purchases (
    user_id, credits, amount_thb, provider_ref, provider, status, paid_at
  )
  VALUES (
    _user_id, _credits, _amount_thb, _provider_ref, _provider, 'paid', now()
  )
  ON CONFLICT (provider_ref) WHERE provider_ref IS NOT NULL DO NOTHING
  RETURNING true INTO inserted;

  IF inserted IS NOT TRUE THEN
    RETURN false;
  END IF;

  INSERT INTO public.scan_wallets (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.scan_wallets
  SET credits = credits + _credits, updated_at = now()
  WHERE user_id = _user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_credit_purchase(uuid, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_credit_purchase(uuid, integer, integer, text, text) TO service_role;