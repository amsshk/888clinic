/**
 * Admin copy editor — server side.
 *
 * Every visible string on the site lives in the i18n dictionary. This lets an
 * admin override any of those strings (English or Thai) at runtime, and ask
 * OpenAI to rewrite the Thai so it reads like a real Bangkok clinic wrote it
 * rather than a machine translation.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Admins only");
}

export type CopySuggestion = { key: string; value: string; why: string };

/** Save (or clear, with an empty value) one override. */
export const saveCopyOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; lang: "en" | "th"; value: string }) => ({
    key: String(input.key ?? "").slice(0, 120),
    lang: input.lang === "th" ? ("th" as const) : ("en" as const),
    value: String(input.value ?? "").slice(0, 4000),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.key) return { ok: false as const, error: "Missing copy key" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.value.trim()) {
      const { error } = await supabaseAdmin
        .from("copy_overrides")
        .delete()
        .eq("copy_key", data.key)
        .eq("lang", data.lang);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, cleared: true };
    }

    const { error } = await supabaseAdmin.from("copy_overrides").upsert({
      copy_key: data.key,
      lang: data.lang,
      value: data.value,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, cleared: false };
  });

/**
 * Rewrite a batch of Thai strings against their English source.
 *
 * Kept to a batch so the admin can fix a whole screen in one pass instead of
 * paying for a request per line.
 */
export const suggestCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      lang: "en" | "th";
      instruction?: string;
      items: Array<{ key: string; source: string; current: string }>;
    }) => ({
      lang: input.lang === "en" ? ("en" as const) : ("th" as const),
      instruction: String(input.instruction ?? "").slice(0, 600),
      items: (Array.isArray(input.items) ? input.items : []).slice(0, 40).map((i) => ({
        key: String(i.key ?? "").slice(0, 120),
        source: String(i.source ?? "").slice(0, 1200),
        current: String(i.current ?? "").slice(0, 1200),
      })),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.items.length) return { ok: false as const, error: "Nothing selected to rewrite" };

    const apiKey = process.env["LOVABLE_API_KEY"] ?? "";

    const instruction = [
      "You are the Thai copywriter for 888clinic, a modern dermatology and aesthetic clinic in Bangkok.",
      "Brand voice: quiet luxury, warm, professional, real doctors, easy to read on a phone.",
      data.lang === "th"
        ? "Rewrite each string into natural, local Bangkok Thai — the way a real clinic's own staff would write it. Use ค่ะ / นะคะ where a sentence addresses the patient, everyday vocabulary, no stiff textbook translation, no transliterated English where a normal Thai word exists. Keep medical terms accurate."
        : "Rewrite each string into clear, confident clinical English — short sentences, no marketing fluff, no exclamation marks.",
      "Keep the same meaning and roughly the same length as the English source; these are UI strings shown in fixed layouts (buttons and labels must stay short).",
      "Preserve any {placeholder} tokens exactly as they appear.",
      data.instruction ? `Extra instruction from the clinic owner: ${data.instruction}` : "",
      'Return STRICT JSON: {"items":[{"key":string,"value":string,"why":string}]} — one entry per input key, "why" is a max 12-word note on what you changed.',
      `Strings to rewrite (JSON): ${JSON.stringify(
        data.items.map((i) => ({ key: i.key, english: i.source, current: i.current })),
      )}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { callGateway, parseJsonContent, CHAT_MODEL } = await import("@/lib/ai-gateway.server");

    const call = await callGateway(
      apiKey,
      {
        model: CHAT_MODEL,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: instruction }],
      },
      "copy-suggest",
    );
    if (!call.ok) return { ok: false as const, error: call.error };

    const parsed = parseJsonContent(call.data);
    const rows = Array.isArray(parsed?.["items"]) ? (parsed!["items"] as unknown[]) : [];
    if (!rows.length) {
      return { ok: false as const, error: "The AI returned an unexpected response. Please try again." };
    }

    const allowed = new Set(data.items.map((i) => i.key));
    const suggestions: CopySuggestion[] = rows
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          key: String(r["key"] ?? "").slice(0, 120),
          value: String(r["value"] ?? "").slice(0, 4000),
          why: String(r["why"] ?? "").slice(0, 200),
        };
      })
      .filter((s) => s.key && s.value && allowed.has(s.key));

    if (!suggestions.length) return { ok: false as const, error: "No usable rewrite came back" };
    return { ok: true as const, suggestions };
  });
