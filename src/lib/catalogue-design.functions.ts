import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, type Fail } from "@/lib/admin-users.shared";
import { CATALOGUE_PRESETS, type CataloguePreset } from "@/lib/catalogue-design.shared";

const presetSchema = z.object({ preset: z.enum(CATALOGUE_PRESETS) });

export type CatalogueDesignResult = { ok: true; preset: CataloguePreset } | Fail;

export const saveCatalogueDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => presetSchema.parse(data))
  .handler(async ({ data, context }): Promise<CatalogueDesignResult> => {
    if (!(await assertAdmin(context.supabase, context.userId))) {
      return { ok: false, error: "Admins only." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("catalogue_design_settings")
      .update({ preset: data.preset, updated_by: context.userId })
      .eq("id", 1);

    return error
      ? { ok: false, error: "Could not save the catalogue design." }
      : { ok: true, preset: data.preset };
  });
