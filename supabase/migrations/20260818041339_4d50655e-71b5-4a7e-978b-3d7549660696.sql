CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox',
  provider text NOT NULL DEFAULT 'stripe',
  provider_ref text NOT NULL,
  stripe_customer_id text,
  email text,
  phone text,
  fulfilment text NOT NULL DEFAULT 'delivery',
  status text NOT NULL DEFAULT 'paid',
  amount_thb integer NOT NULL DEFAULT 0,
  shipping_name text,
  shipping_address jsonb,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX orders_provider_ref_key ON public.orders(provider, provider_ref);
CREATE INDEX orders_user_id_idx ON public.orders(user_id);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  price_id text,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount_thb integer NOT NULL DEFAULT 0
);
CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);

CREATE TABLE public.product_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text,
  price_id text,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  amount_thb integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  fulfilment text NOT NULL DEFAULT 'delivery',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_subscriptions_stripe_id_key ON public.product_subscriptions(stripe_subscription_id);
CREATE INDEX product_subscriptions_user_id_idx ON public.product_subscriptions(user_id);

GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
GRANT SELECT ON public.product_subscriptions TO authenticated;
GRANT ALL ON public.product_subscriptions TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Staff view all order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Users view own refills" ON public.product_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all refills" ON public.product_subscriptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.fulfill_product_order(
  _user_id uuid,
  _provider_ref text,
  _environment text,
  _email text,
  _phone text,
  _fulfilment text,
  _amount_thb integer,
  _shipping_name text,
  _shipping_address jsonb,
  _stripe_customer_id text,
  _items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _item jsonb;
BEGIN
  SELECT id INTO _order_id FROM public.orders
   WHERE provider = 'stripe' AND provider_ref = _provider_ref;
  IF _order_id IS NOT NULL THEN
    RETURN _order_id;
  END IF;

  INSERT INTO public.orders (user_id, environment, provider_ref, stripe_customer_id, email, phone,
                             fulfilment, amount_thb, shipping_name, shipping_address)
  VALUES (_user_id, COALESCE(_environment, 'sandbox'), _provider_ref, _stripe_customer_id, _email, _phone,
          COALESCE(_fulfilment, 'delivery'), COALESCE(_amount_thb, 0), _shipping_name, _shipping_address)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    INSERT INTO public.order_items (order_id, price_id, product_name, quantity, unit_amount_thb)
    VALUES (
      _order_id,
      _item->>'price_id',
      COALESCE(_item->>'product_name', 'Product'),
      COALESCE((_item->>'quantity')::int, 1),
      COALESCE((_item->>'unit_amount_thb')::int, 0)
    );
  END LOOP;

  RETURN _order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_product_subscription(
  _user_id uuid,
  _stripe_subscription_id text,
  _environment text,
  _stripe_customer_id text,
  _price_id text,
  _product_name text,
  _quantity integer,
  _amount_thb integer,
  _status text,
  _fulfilment text,
  _current_period_end timestamptz,
  _cancel_at_period_end boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_subscriptions (
    user_id, stripe_subscription_id, environment, stripe_customer_id, price_id, product_name,
    quantity, amount_thb, status, fulfilment, current_period_end, cancel_at_period_end, updated_at
  ) VALUES (
    _user_id, _stripe_subscription_id, COALESCE(_environment, 'sandbox'), _stripe_customer_id, _price_id, _product_name,
    COALESCE(_quantity, 1), COALESCE(_amount_thb, 0), COALESCE(_status, 'active'), COALESCE(_fulfilment, 'delivery'),
    _current_period_end, COALESCE(_cancel_at_period_end, false), now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    price_id = EXCLUDED.price_id,
    product_name = COALESCE(EXCLUDED.product_name, public.product_subscriptions.product_name),
    quantity = EXCLUDED.quantity,
    amount_thb = EXCLUDED.amount_thb,
    status = EXCLUDED.status,
    fulfilment = COALESCE(EXCLUDED.fulfilment, public.product_subscriptions.fulfilment),
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_product_order(uuid, text, text, text, text, text, integer, text, jsonb, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_product_subscription(uuid, text, text, text, text, text, integer, integer, text, text, timestamptz, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_product_order(uuid, text, text, text, text, text, integer, text, jsonb, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_product_subscription(uuid, text, text, text, text, text, integer, integer, text, text, timestamptz, boolean) TO service_role;