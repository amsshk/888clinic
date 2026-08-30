import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Admins only");
}

/** Health of the clinic's own MALI service plus the current fallback setting. */
export const getEngineStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getMaliHealth } = await import("@/lib/mali-aesthetic.server");
    const { languageModelFallbackAllowed } = await import("@/lib/engine-settings.server");
    const [health, fallback] = await Promise.all([getMaliHealth(), languageModelFallbackAllowed()]);
    return { health, allowFallback: fallback };
  });

export const setLanguageModelFallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { allow: boolean }) => ({ allow: Boolean(input.allow) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("engine_settings").upsert({
      id: "default",
      allow_language_model_fallback: data.allow,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, allow: data.allow };
  });

/** Admin smoke test: runs a real photo through /v1/aesthetic-preview. */
export const testAestheticEngine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dataUrl: string; zoneId?: string }) => {
    const dataUrl = String(input.dataUrl ?? "");
    if (!dataUrl.startsWith("data:image/")) throw new Error("Upload a photo first");
    return { dataUrl, zoneId: String(input.zoneId ?? "glabella").slice(0, 40) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { renderAestheticPreview } = await import("@/lib/mali-aesthetic.server");
    const result = await renderAestheticPreview({
      dataUrl: data.dataUrl,
      zones: [
        {
          id: data.zoneId,
          label: "Engine test zone",
          treatment: "botox",
          dose: 20,
          strength: 0.8,
        },
      ],
      goal: "balanced",
      age: "",
      gender: "",
      notes: "admin engine test",
    });
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, preview: result.preview };
  });
