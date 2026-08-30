import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { base64Encode } from "@/lib/base64";

export type ScanTestResult = {
  id: string;
  created_at: string;
  condition: string;
  confidence: number;
  severity: string;
  urgency: string;
  summary: string;
  findings: Array<{ label: string; detail: string }>;
  recommendations: string[];
  body_area: string;
  concern: string;
  mali: {
    melanoma: number;
    nevus: number;
    seborrheicKeratosis: number;
    modelVersion: string;
    primary: boolean;
  } | null;
};

/**
 * Admin-only dry run of the MALI-first scan pipeline: no credit is consumed,
 * no face signature is stored and nothing is written to `skin_scans`. Used to
 * verify the report output end to end.
 */
export const runScanTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      storagePath: string;
      bodyArea?: string;
      concern?: string;
      mali?: { melanoma: number; nevus: number; seborrheicKeratosis: number; modelVersion: string } | null;
    }) => {
      const storagePath = String(input.storagePath ?? "").trim();
      if (!storagePath) throw new Error("Missing image");
      return {
        storagePath,
        bodyArea: String(input.bodyArea ?? "").slice(0, 80),
        concern: String(input.concern ?? "").slice(0, 500),
        mali: input.mali
          ? {
              melanoma: Number(input.mali.melanoma),
              nevus: Number(input.mali.nevus),
              seborrheicKeratosis: Number(input.mali.seborrheicKeratosis),
              modelVersion: String(input.mali.modelVersion ?? "").slice(0, 60),
            }
          : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, error: "Admins only." };

    if (!data.storagePath.startsWith(`${userId}/`)) {
      return { ok: false as const, error: "That image does not belong to your account." };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI is not configured yet." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const file = await supabaseAdmin.storage.from("scans").download(data.storagePath);
    if (file.error || !file.data) {
      return { ok: false as const, error: "We could not read that image. Please upload it again." };
    }
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength > 8_000_000) {
      return { ok: false as const, error: "Image is too large — please upload one under 8MB." };
    }
    const dataUrl = `data:${file.data.type || "image/jpeg"};base64,${base64Encode(bytes)}`;

    const { runScanPipeline } = await import("@/lib/scan-pipeline.server");
    const outcome = await runScanPipeline({
      apiKey,
      dataUrl,
      bodyArea: data.bodyArea,
      concern: data.concern,
      clientMali: data.mali,
    });

    if (!outcome.ok) return { ok: false as const, error: outcome.error };

    const scan: ScanTestResult = {
      id: `test-${Date.now().toString(36)}0000`,
      created_at: new Date().toISOString(),
      condition: outcome.condition,
      confidence: outcome.confidence,
      severity: outcome.severity,
      urgency: outcome.urgency,
      summary: outcome.summary,
      findings: outcome.findings,
      recommendations: outcome.recommendations,
      body_area: data.bodyArea,
      concern: data.concern,
      mali:
        outcome.probs && outcome.modelVersion
          ? {
              melanoma: outcome.probs.melanoma,
              nevus: outcome.probs.nevus,
              seborrheicKeratosis: outcome.probs.seborrheicKeratosis,
              modelVersion: outcome.modelVersion,
              primary: outcome.maliPrimary,
            }
          : null,
    };

    return {
      ok: true as const,
      scan,
      engine: {
        source: outcome.modelVersion ? ("mali" as const) : ("language-model" as const),
        modelVersion: outcome.modelVersion,
        maliPrimary: outcome.maliPrimary,
      },
    };
  });
