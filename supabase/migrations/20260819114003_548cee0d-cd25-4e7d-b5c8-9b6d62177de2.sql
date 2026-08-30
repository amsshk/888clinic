-- Wallet & scans
GRANT SELECT ON public.scan_wallets TO authenticated;
GRANT ALL ON public.scan_wallets TO service_role;

GRANT SELECT, DELETE ON public.skin_scans TO authenticated;
GRANT ALL ON public.skin_scans TO service_role;

GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;

GRANT SELECT ON public.face_identities TO authenticated;
GRANT ALL ON public.face_identities TO service_role;

-- Commerce
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT ON public.product_subscriptions TO authenticated;
GRANT ALL ON public.product_subscriptions TO service_role;

-- Profile & roles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Clinic inbox (staff only via RLS)
GRANT SELECT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;

GRANT SELECT ON public.signup_attempts TO authenticated;
GRANT ALL ON public.signup_attempts TO service_role;

-- Media: published items are public
GRANT SELECT ON public.media_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;