/**
 * Admin-only Meta ads copy studio.
 *
 * Generates ready-to-paste Facebook/Instagram ad variants (primary text,
 * headline, description, CTA, hashtags) in English and/or local Thai, on the
 * clinic's own OpenAI account. Nothing here is patient-facing.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adCopySchema, videoJobSchema, videoPromptSchema } from "@/lib/marketing-ai.shared";
import type { AdVariant, MarketingVideoStatus } from "@/lib/marketing-ai.shared";

export type { AdVariant, MarketingVideoStatus } from "@/lib/marketing-ai.shared";

export const generateAdCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adCopySchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; variants: AdVariant[] } | { ok: false; error: string }> => {
      const { createAdCopy } = await import("@/lib/marketing-ai.server");
      return createAdCopy(data, context);
    },
  );

export const generateMarketingVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => videoPromptSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> => {
    const { startVideoGeneration } = await import("@/lib/marketing-ai.server");
    return startVideoGeneration(data, context);
  });

export const getMarketingVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => videoJobSchema.parse(data))
  .handler(async ({ data, context }): Promise<MarketingVideoStatus> => {
    const { readVideoGeneration } = await import("@/lib/marketing-ai.server");
    return readVideoGeneration(data.jobId, context);
  });
