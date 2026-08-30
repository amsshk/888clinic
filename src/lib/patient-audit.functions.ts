import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-users.shared";

export type ReportAuditAction = "open" | "download" | "print";

export type ReportAuditEntry = {
  id: string;
  patient_hn: string | null;
  patient_name: string;
  actor_email: string | null;
  action: ReportAuditAction;
  created_at: string;
};

const ACTIONS: ReportAuditAction[] = ["open", "download", "print"];



export const logPatientReportAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string; action: ReportAuditAction }) => {
    if (typeof input?.patientId !== "string" || !input.patientId) throw new Error("patientId required");
    if (!ACTIONS.includes(input.action)) throw new Error("invalid action");
    return { patientId: input.patientId, action: input.action };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { supabase, userId, claims } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false };

    const { data: patient } = await supabase
      .from("patients")
      .select("id, hn, full_name")
      .eq("id", data.patientId)
      .maybeSingle();
    if (!patient) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("patient_report_audit").insert({
      patient_id: patient.id,
      patient_hn: patient.hn,
      patient_name: patient.full_name,
      actor_id: userId,
      actor_email: (claims?.["email"] as string | undefined) ?? null,
      action: data.action,
    });

    return { ok: !error };
  });

export const listPatientReportAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { patientId?: string }) => ({ patientId: input?.patientId ?? null }))
  .handler(async ({ data, context }): Promise<{ ok: true; entries: ReportAuditEntry[] } | { ok: false; error: string }> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    let query = supabase
      .from("patient_report_audit")
      .select("id, patient_hn, patient_name, actor_email, action, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.patientId) query = query.eq("patient_id", data.patientId);

    const { data: rows, error } = await query;
    if (error) return { ok: false, error: "Could not load the audit log." };
    return { ok: true, entries: (rows ?? []) as ReportAuditEntry[] };
  });
