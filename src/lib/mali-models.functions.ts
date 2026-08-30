import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MaliModelRow = {
  id: string;
  version: string;
  storage_path: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Admins only");
}

/** Signed URL + version of the model the browser should run. */
export const getActiveMaliModel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: model } = await supabaseAdmin
      .from("mali_models")
      .select("version, storage_path")
      .eq("is_active", true)
      .maybeSingle();

    if (!model) return { model: null };

    const signed = await supabaseAdmin.storage
      .from("models")
      .createSignedUrl(model.storage_path, 60 * 60);

    if (signed.error || !signed.data) return { model: null };

    return { model: { version: model.version, url: signed.data.signedUrl } };
  });

export const listMaliModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("mali_models")
      .select("id, version, storage_path, notes, is_active, created_at")
      .order("created_at", { ascending: false });
    return { models: (data ?? []) as MaliModelRow[] };
  });

export const registerMaliModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storagePath: string; version: string; notes?: string; activate?: boolean }) => {
    const storagePath = String(input.storagePath ?? "").trim();
    const version = String(input.version ?? "").trim().slice(0, 60);
    if (!storagePath.endsWith(".onnx")) throw new Error("Model file must be a .onnx export");
    if (!version) throw new Error("Give the model a version tag");
    return {
      storagePath,
      version,
      notes: String(input.notes ?? "").slice(0, 1000),
      activate: input.activate !== false,
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.activate) {
      await supabaseAdmin.from("mali_models").update({ is_active: false }).eq("is_active", true);
    }

    const inserted = await supabaseAdmin
      .from("mali_models")
      .insert({
        version: data.version,
        storage_path: data.storagePath,
        notes: data.notes || null,
        is_active: data.activate,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (inserted.error) return { ok: false as const, error: inserted.error.message };
    return { ok: true as const, id: inserted.data.id };
  });

export const activateMaliModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mali_models").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabaseAdmin
      .from("mali_models")
      .update({ is_active: true })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
