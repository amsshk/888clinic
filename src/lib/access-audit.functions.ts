import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-users.shared";

export type AccessAuditAction =
  | "role_granted"
  | "role_removed"
  | "credits_updated"
  | "account_created";

export type AccessAuditEntry = {
  id: string;
  action: AccessAuditAction;
  target_email: string | null;
  role: string | null;
  granted: boolean | null;
  credits_before: number | null;
  credits_after: number | null;
  free_before: number | null;
  free_after: number | null;
  actor_email: string | null;
  detail: string | null;
  created_at: string;
};

export const listAccessAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: true; entries: AccessAuditEntry[] } | { ok: false; error: string }> => {
      const { supabase, userId } = context;
      if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

      const { data, error } = await supabase
        .from("access_audit")
        .select(
          "id, action, target_email, role, granted, credits_before, credits_after, free_before, free_after, actor_email, detail, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) return { ok: false, error: "Could not load the access audit log." };
      return { ok: true, entries: (data ?? []) as AccessAuditEntry[] };
    },
  );
