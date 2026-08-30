export type AccessAuditInsert = {
  action: "role_granted" | "role_removed" | "credits_updated" | "account_created";
  actorId: string;
  actorEmail: string | null;
  targetUserId: string;
  targetEmail?: string | null;
  role?: string | null;
  granted?: boolean | null;
  creditsBefore?: number | null;
  creditsAfter?: number | null;
  freeBefore?: number | null;
  freeAfter?: number | null;
  detail?: string | null;
};

/** Records an admin action on roles or scan credits. Never throws. */
export async function recordAccessAudit(entry: AccessAuditInsert): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("access_audit").insert({
      action: entry.action,
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      target_user_id: entry.targetUserId,
      target_email: entry.targetEmail ?? null,
      role: entry.role ?? null,
      granted: entry.granted ?? null,
      credits_before: entry.creditsBefore ?? null,
      credits_after: entry.creditsAfter ?? null,
      free_before: entry.freeBefore ?? null,
      free_after: entry.freeAfter ?? null,
      detail: entry.detail ?? null,
    });
  } catch {
    // auditing must never block the admin action
  }
}
