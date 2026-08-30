/**
 * Dr Mali engine settings.
 *
 * The lesion path is MALI-only by default: when the clinic's model service has
 * no verdict, the scan fails closed instead of quietly letting the language
 * model diagnose. An admin can temporarily allow the language-model fallback so
 * the tool keeps working during an outage — any report produced that way is
 * stamped as a screening-aid reading rather than a MALI verdict.
 */

export async function languageModelFallbackAllowed(): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("engine_settings")
      .select("allow_language_model_fallback")
      .eq("id", "default")
      .maybeSingle();
    return Boolean(data?.allow_language_model_fallback);
  } catch (error) {
    console.error("[engine-settings] read failed", error);
    return false;
  }
}
