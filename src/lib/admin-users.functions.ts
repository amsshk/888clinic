import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdmin,
  createSchema,
  creditsSchema,
  roleChangeSchema,
  type Fail,
  type TeamMember,
} from "@/lib/admin-users.shared";
import { recordAccessAudit } from "@/lib/access-audit.server";

export type { TeamMember };

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; members: TeamMember[] } | Fail> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) return { ok: false, error: "Could not load accounts." };

    const ids = list.users.map((u) => u.id);
    const [{ data: roles }, { data: wallets }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("scan_wallets").select("user_id, credits, free_scans_remaining").in("user_id", ids),
      supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as string]);
    }
    const walletMap = new Map((wallets ?? []).map((w) => [w.user_id, w]));
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const members: TeamMember[] = list.users.map((u) => {
      const wallet = walletMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: nameMap.get(u.id) ?? (u.user_metadata?.["full_name"] as string | undefined) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
        roles: roleMap.get(u.id) ?? [],
        credits: wallet?.credits ?? 0,
        free_scans_remaining: wallet?.free_scans_remaining ?? 0,
      };
    });

    members.sort((a, b) => {
      const rank = (m: TeamMember) => (m.roles.includes("admin") ? 0 : m.roles.includes("staff") ? 1 : 2);
      return rank(a) - rank(b) || (a.email ?? "").localeCompare(b.email ?? "");
    });

    return { ok: true, members };
  });

export const createTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; userId: string } | Fail> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.fullName ? { full_name: data.fullName } : {},
    });
    if (error || !created.user) {
      return { ok: false, error: error?.message ?? "Could not create this account." };
    }

    const newId = created.user.id;

    if (data.role !== "patient") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newId, role: data.role });
      if (roleError) return { ok: false, error: "Account created, but the role could not be assigned." };
    }

    if (data.credits > 0) {
      await supabaseAdmin.from("scan_wallets").upsert(
        { user_id: newId, credits: data.credits, free_scans_remaining: 1 },
        { onConflict: "user_id" },
      );
    }

    const actorEmail = (context.claims?.["email"] as string | undefined) ?? null;
    await recordAccessAudit({
      action: "account_created",
      actorId: userId,
      actorEmail,
      targetUserId: newId,
      targetEmail: data.email,
      role: data.role,
      creditsAfter: data.credits,
      detail: `Account created with role ${data.role}`,
    });

    return { ok: true, userId: newId };
  });

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleChangeSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };
    if (data.userId === userId && data.role === "admin" && !data.grant) {
      return { ok: false, error: "You cannot remove your own admin role." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) return { ok: false, error: "Could not grant that role." };
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) return { ok: false, error: "Could not remove that role." };
    }

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    await recordAccessAudit({
      action: data.grant ? "role_granted" : "role_removed",
      actorId: userId,
      actorEmail: (context.claims?.["email"] as string | undefined) ?? null,
      targetUserId: data.userId,
      targetEmail: target?.user?.email ?? null,
      role: data.role,
      granted: data.grant,
      detail: `${data.grant ? "Granted" : "Removed"} ${data.role} role`,
    });

    return { ok: true };
  });

export const setTeamCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => creditsSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("scan_wallets")
      .select("credits, free_scans_remaining")
      .eq("user_id", data.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("scan_wallets").upsert(
      {
        user_id: data.userId,
        credits: data.credits,
        free_scans_remaining: data.freeScans,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: "Could not update the scan balance." };

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    await recordAccessAudit({
      action: "credits_updated",
      actorId: userId,
      actorEmail: (context.claims?.["email"] as string | undefined) ?? null,
      targetUserId: data.userId,
      targetEmail: target?.user?.email ?? null,
      creditsBefore: before?.credits ?? 0,
      creditsAfter: data.credits,
      freeBefore: before?.free_scans_remaining ?? 0,
      freeAfter: data.freeScans,
      detail: `Credits ${before?.credits ?? 0} → ${data.credits}, free scans ${before?.free_scans_remaining ?? 0} → ${data.freeScans}`,
    });

    return { ok: true };
  });
