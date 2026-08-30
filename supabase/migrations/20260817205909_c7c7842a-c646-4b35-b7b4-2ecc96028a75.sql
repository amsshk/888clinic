revoke all on function public.consume_scan_credit(uuid) from public;
revoke all on function public.consume_scan_credit(uuid) from anon;
revoke all on function public.consume_scan_credit(uuid) from authenticated;
grant execute on function public.consume_scan_credit(uuid) to service_role;

revoke all on function public.refund_scan_credit(uuid, text) from public;
revoke all on function public.refund_scan_credit(uuid, text) from anon;
revoke all on function public.refund_scan_credit(uuid, text) from authenticated;
grant execute on function public.refund_scan_credit(uuid, text) to service_role;