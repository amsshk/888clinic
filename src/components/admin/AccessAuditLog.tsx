import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listAccessAudit,
  type AccessAuditEntry,
} from "@/lib/access-audit.functions";

const LABELS: Record<AccessAuditEntry["action"], string> = {
  role_granted: "Role granted",
  role_removed: "Role removed",
  credits_updated: "Scan credits updated",
  account_created: "Account created",
};

export function AccessAuditLog({ reloadKey = 0 }: { reloadKey?: number }) {
  const load = useServerFn(listAccessAudit);
  const [entries, setEntries] = useState<AccessAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await load({} as never);
      setEntries(res.ok ? res.entries : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh, reloadKey]);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-gold" />
          <h2 className="text-lg">Role &amp; credit audit log</h2>
        </div>
        <Button variant="outline" size="sm" className="rounded-none" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Every role change and scan-credit update, with the admin who made it and the exact time.
      </p>

      {loading ? (
        <Loader2 className="mt-6 size-5 animate-spin text-gold" />
      ) : entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No changes recorded yet.</p>
      ) : (
        <ul className="mt-5 space-y-px bg-border">
          {entries.map((e) => (
            <li key={e.id} className="bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm">
                  <span className="uppercase tracking-wider text-gold">{LABELS[e.action]}</span>
                  {" · "}
                  {e.target_email ?? "unknown account"}
                </p>
                <time className="text-xs text-muted-foreground" dateTime={e.created_at}>
                  {new Date(e.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {e.detail ?? e.role ?? ""}
                {e.actor_email ? ` — by ${e.actor_email}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
