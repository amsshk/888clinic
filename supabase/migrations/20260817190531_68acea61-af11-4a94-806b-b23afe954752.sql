REVOKE ALL ON FUNCTION public.consume_scan_credit(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_scan_credit(uuid, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_wallet() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_scan_credit(uuid, text) TO service_role;