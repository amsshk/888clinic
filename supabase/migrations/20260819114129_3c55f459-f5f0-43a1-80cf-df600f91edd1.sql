GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.consume_scan_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_scan_credit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_credit_purchase(uuid, integer, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_product_order(uuid, text, text, text, text, text, integer, text, jsonb, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_product_subscription(uuid, text, text, text, text, text, integer, integer, text, text, timestamptz, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_face_identity(text, uuid, numeric) TO service_role;