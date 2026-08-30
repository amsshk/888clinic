INSERT INTO public.scan_wallets (user_id, credits, free_scans_remaining)
VALUES ('e8bce4f6-a3dd-492e-8234-42a998e7630b', 10, 0)
ON CONFLICT (user_id) DO UPDATE SET credits = public.scan_wallets.credits + 20, updated_at = now();

INSERT INTO public.scan_wallets (user_id, credits, free_scans_remaining)
VALUES ('e8bce4f6-a3dd-492e-8234-42a998e7630b', 10, 0)
ON CONFLICT (user_id) DO UPDATE SET credits = public.scan_wallets.credits + 20, updated_at = now();