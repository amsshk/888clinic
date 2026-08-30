import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatThb } from "@/lib/skincare-catalog";
import {
  getBillingOverview,
  type BillingOverview,
} from "@/lib/billing-admin.functions";

const dt = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BillingTab() {
  const load = useServerFn(getBillingOverview);
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await load();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setData(result);
    } catch {
      toast.error("Could not load billing data");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, payments } = data;
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? data.rows.filter(
        (r) =>
          (r.email ?? "").toLowerCase().includes(needle) || (r.fullName ?? "").toLowerCase().includes(needle),
      )
    : data.rows;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Billing &amp; credit usage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Free trial scans, paid credits, and every payment attempt across the clinic.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-none" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Collected"
          value={formatThb(summary.paidThb)}
          hint={`${summary.paidCount} successful payments`}
        />
        <Stat
          label="Not collected"
          value={formatThb(summary.unpaidThb)}
          hint={`${summary.unpaidCount} pending / failed`}
        />
        <Stat
          label="Scan packs"
          value={formatThb(summary.scanRevenueThb)}
          hint={`${summary.creditsPurchased} credits sold`}
        />
        <Stat label="Skincare orders" value={formatThb(summary.productRevenueThb)} />
        <Stat
          label="Free scans used"
          value={String(summary.freeScansUsed)}
          hint={`${summary.freeScansRemaining} free scans still unused`}
        />
        <Stat
          label="Paid scans used"
          value={String(summary.creditScansUsed)}
          hint={`${summary.creditsRemaining} credits left in wallets`}
        />
        <Stat label="Accounts" value={String(summary.users)} />
        <Stat
          label="Conversion"
          value={
            summary.freeScansUsed > 0
              ? `${Math.round((rows.filter((r) => r.paidPacks > 0).length / summary.users) * 100)}%`
              : "—"
          }
          hint="Accounts that bought at least one pack"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg">Per-patient usage</h3>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full max-w-xs rounded-none"
          />
        </div>
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[54rem] text-sm">
            <thead className="bg-accent/60 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-normal">Patient</th>
                <th className="px-4 py-3 text-right font-normal">Free used</th>
                <th className="px-4 py-3 text-right font-normal">Paid scans</th>
                <th className="px-4 py-3 text-right font-normal">Balance</th>
                <th className="px-4 py-3 text-right font-normal">Packs</th>
                <th className="px-4 py-3 text-right font-normal">Spent</th>
                <th className="px-4 py-3 text-right font-normal">Last scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td className="px-4 py-3">
                    <p className="truncate">{r.fullName ?? r.email ?? "Unknown"}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{r.freeScansUsed}</td>
                  <td className="px-4 py-3 text-right">{r.creditScansUsed}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {r.freeRemaining} free · {r.creditsRemaining} credits
                  </td>
                  <td className="px-4 py-3 text-right">{r.paidPacks}</td>
                  <td className="px-4 py-3 text-right">{formatThb(r.spentThb)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{dt(r.lastScanAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No accounts match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg">Recent payments</h3>
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-accent/60 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-normal">Date</th>
                <th className="px-4 py-3 text-left font-normal">Customer</th>
                <th className="px-4 py-3 text-left font-normal">Type</th>
                <th className="px-4 py-3 text-left font-normal">Status</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={`${p.kind}-${p.id}`}>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{dt(p.createdAt)}</td>
                  <td className="px-4 py-3 truncate">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.kind === "scan-pack" ? `Scan pack (${p.credits} credits)` : "Skincare order"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={p.status === "paid" || p.status === "fulfilled" || p.status === "packed" ? "default" : "outline"}
                      className="rounded-none text-[0.65rem] uppercase tracking-[0.12em]"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{formatThb(p.amountThb)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
