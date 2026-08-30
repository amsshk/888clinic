import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, type Fail } from "@/lib/admin-users.shared";

export type BillingUserRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  freeRemaining: number;
  creditsRemaining: number;
  freeScansUsed: number;
  creditScansUsed: number;
  scansTotal: number;
  paidPacks: number;
  creditsPurchased: number;
  spentThb: number;
  lastScanAt: string | null;
};

export type BillingPayment = {
  id: string;
  kind: "scan-pack" | "skincare";
  createdAt: string;
  paidAt: string | null;
  status: string;
  amountThb: number;
  credits: number | null;
  email: string | null;
  reference: string | null;
};

export type BillingSummary = {
  users: number;
  freeScansUsed: number;
  freeScansRemaining: number;
  creditScansUsed: number;
  creditsRemaining: number;
  creditsPurchased: number;
  paidCount: number;
  paidThb: number;
  unpaidCount: number;
  unpaidThb: number;
  scanRevenueThb: number;
  productRevenueThb: number;
};

export type BillingOverview = {
  ok: true;
  summary: BillingSummary;
  rows: BillingUserRow[];
  payments: BillingPayment[];
};

export const getBillingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingOverview | Fail> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: list }, { data: wallets }, { data: scans }, { data: purchases }, { data: orders }, { data: profiles }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
        supabaseAdmin.from("scan_wallets").select("user_id, credits, free_scans_remaining"),
        supabaseAdmin.from("skin_scans").select("user_id, charged, created_at"),
        supabaseAdmin
          .from("credit_purchases")
          .select("id, user_id, credits, amount_thb, status, provider_ref, created_at, paid_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("orders")
          .select("id, user_id, amount_thb, status, provider_ref, email, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("profiles").select("id, full_name, email"),
      ]);

    const users = list?.users ?? [];
    const walletMap = new Map((wallets ?? []).map((w) => [w.user_id, w]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const perUser = new Map<
      string,
      { free: number; credit: number; total: number; last: string | null; packs: number; credits: number; spent: number }
    >();
    const bump = (id: string) => {
      const cur = perUser.get(id) ?? { free: 0, credit: 0, total: 0, last: null, packs: 0, credits: 0, spent: 0 };
      perUser.set(id, cur);
      return cur;
    };

    for (const s of scans ?? []) {
      const cur = bump(s.user_id);
      cur.total += 1;
      if (s.charged === "free") cur.free += 1;
      else if (s.charged === "credit") cur.credit += 1;
      if (!cur.last || s.created_at > cur.last) cur.last = s.created_at;
    }

    let paidCount = 0;
    let paidThb = 0;
    let unpaidCount = 0;
    let unpaidThb = 0;
    let creditsPurchased = 0;
    let scanRevenueThb = 0;

    for (const p of purchases ?? []) {
      const isPaid = p.status === "paid";
      if (isPaid) {
        paidCount += 1;
        paidThb += p.amount_thb;
        scanRevenueThb += p.amount_thb;
        creditsPurchased += p.credits;
        const cur = bump(p.user_id);
        cur.packs += 1;
        cur.credits += p.credits;
        cur.spent += p.amount_thb;
      } else {
        unpaidCount += 1;
        unpaidThb += p.amount_thb;
      }
    }

    let productRevenueThb = 0;
    for (const o of orders ?? []) {
      if (o.status === "cancelled" || o.status === "failed") {
        unpaidCount += 1;
        unpaidThb += o.amount_thb;
        continue;
      }
      paidCount += 1;
      paidThb += o.amount_thb;
      productRevenueThb += o.amount_thb;
      const cur = bump(o.user_id);
      cur.spent += o.amount_thb;
    }

    const rows: BillingUserRow[] = users.map((u) => {
      const wallet = walletMap.get(u.id);
      const agg = perUser.get(u.id);
      const profile = profileMap.get(u.id);
      return {
        userId: u.id,
        email: u.email ?? profile?.email ?? null,
        fullName: profile?.full_name ?? (u.user_metadata?.["full_name"] as string | undefined) ?? null,
        createdAt: u.created_at,
        freeRemaining: wallet?.free_scans_remaining ?? 0,
        creditsRemaining: wallet?.credits ?? 0,
        freeScansUsed: agg?.free ?? 0,
        creditScansUsed: agg?.credit ?? 0,
        scansTotal: agg?.total ?? 0,
        paidPacks: agg?.packs ?? 0,
        creditsPurchased: agg?.credits ?? 0,
        spentThb: agg?.spent ?? 0,
        lastScanAt: agg?.last ?? null,
      };
    });

    rows.sort(
      (a, b) => b.spentThb - a.spentThb || b.scansTotal - a.scansTotal || (a.email ?? "").localeCompare(b.email ?? ""),
    );

    const emailFor = (id: string) => users.find((u) => u.id === id)?.email ?? profileMap.get(id)?.email ?? null;

    const payments: BillingPayment[] = [
      ...(purchases ?? []).map((p) => ({
        id: p.id,
        kind: "scan-pack" as const,
        createdAt: p.created_at,
        paidAt: p.paid_at ?? null,
        status: p.status,
        amountThb: p.amount_thb,
        credits: p.credits,
        email: emailFor(p.user_id),
        reference: p.provider_ref ?? null,
      })),
      ...(orders ?? []).map((o) => ({
        id: o.id,
        kind: "skincare" as const,
        createdAt: o.created_at,
        paidAt: o.created_at,
        status: o.status,
        amountThb: o.amount_thb,
        credits: null,
        email: o.email ?? emailFor(o.user_id),
        reference: o.provider_ref ?? null,
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 60);

    const summary: BillingSummary = {
      users: rows.length,
      freeScansUsed: rows.reduce((n, r) => n + r.freeScansUsed, 0),
      freeScansRemaining: rows.reduce((n, r) => n + r.freeRemaining, 0),
      creditScansUsed: rows.reduce((n, r) => n + r.creditScansUsed, 0),
      creditsRemaining: rows.reduce((n, r) => n + r.creditsRemaining, 0),
      creditsPurchased,
      paidCount,
      paidThb,
      unpaidCount,
      unpaidThb,
      scanRevenueThb,
      productRevenueThb,
    };

    return { ok: true, summary, rows, payments };
  });
