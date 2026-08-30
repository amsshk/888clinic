import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { base64Encode } from "@/lib/base64";
import {
  FACE_ZONES,
  doseBand,
  effectStrength,
  typicalRangeLabel,
  zoneSpec,
} from "@/lib/aesthetic-zones";


type PreviewShape = {
  afterImage: string;
  engine: string;
  engineVersion: string;
  stages: string[];
};

export type PredictionZone = {
  id: string;
  label: string;
  treatment: "botox" | "filler";
  dose: number;
};

export type PredictionInput = {
  storagePath: string;
  /** PNG data URL built in the browser: transparent = editable zone. */
  maskImage?: string;
  zones: PredictionZone[];
  age: string;
  gender: string;
  goal: string;
  notes: string;
  lang?: string;
};

const GOALS: Record<string, string> = {
  natural: "very natural and subtle — nobody should be able to tell",
  balanced: "balanced and refreshed — visible but tasteful",
  defined: "clearly defined and sculpted, still anatomically realistic",
};

/**
 * How much of the dose's full realistic effect to render.
 * Responders vary widely, so the preview is deliberately calibrated below the
 * theoretical maximum instead of showing a best-case result as the expectation.
 */
const GOAL_RESPONSE: Record<string, number> = {
  natural: 0.6,
  balanced: 0.8,
  defined: 0.95,
};


export const predictAestheticResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PredictionInput) => {
    const storagePath = String(input.storagePath ?? "").trim();
    if (!storagePath) throw new Error("Missing photo");
    const zones = (Array.isArray(input.zones) ? input.zones : []).slice(0, 12).map((z) => ({
      id: String(z.id ?? "").slice(0, 40),
      label: String(z.label ?? "").slice(0, 60),
      treatment: z.treatment === "botox" ? ("botox" as const) : ("filler" as const),
      dose: Math.max(0.5, Math.min(40, Number(z.dose ?? 1))),
    }));
    if (!zones.length) throw new Error("Select at least one treatment area");
    const mask = String(input.maskImage ?? "");
    // A mask is optional (older clients, or a browser that could not rasterise
    // one) — but if present it must be a PNG data URL of sane size.
    const maskImage =
      mask.startsWith("data:image/png;base64,") && mask.length < 6_000_000 ? mask : "";

    return {
      storagePath,
      maskImage,
      zones,
      age: String(input.age ?? "").slice(0, 10),
      gender: String(input.gender ?? "").slice(0, 30),
      goal: String(input.goal ?? "balanced").slice(0, 20),
      notes: String(input.notes ?? "").slice(0, 500),
      lang: input.lang === "th" ? ("th" as const) : ("en" as const),
    };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (!data.storagePath.startsWith(`${userId}/`)) {
      return { ok: false as const, error: "That photo does not belong to your account." };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI is not configured yet." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Read the photo BEFORE charging so the identity check can run first.
    const file = await supabaseAdmin.storage.from("scans").download(data.storagePath);
    if (file.error || !file.data) {
      return { ok: false as const, error: "We could not read that photo. Please upload it again." };
    }
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength > 8_000_000) {
      return { ok: false as const, error: "Photo is too large — please upload one under 8MB." };
    }
    const dataUrl = `data:${file.data.type || "image/jpeg"};base64,${base64Encode(bytes)}`;

    const { checkFaceIdentity, willUseFreeScan } = await import("@/lib/face-identity.server");
    const usingFreeScan = await willUseFreeScan(userId);
    const identity = await checkFaceIdentity({
      apiKey,
      userId,
      dataUrl,
      kind: "predict",
      storagePath: data.storagePath,
      usingFreeScan,
    });
    if (identity.blocked) {
      return { ok: false as const, error: identity.message, duplicateFace: true, needsCredits: true };
    }

    const { data: charged, error: chargeError } = await supabaseAdmin.rpc("consume_scan_credit", {
      _user_id: userId,
    });
    if (chargeError) {
      console.error("[aesthetic-ai] credit error", chargeError);
      return { ok: false as const, error: "Could not check your balance. Please try again." };
    }
    if (!charged) return { ok: false as const, error: "no_credits", needsCredits: true };

    const refund = async () => {
      await supabaseAdmin.rpc("refund_scan_credit", { _user_id: userId, _kind: charged });
    };

    try {
      const specs = data.zones.map((z) => {
        const zone = FACE_ZONES.find((f) => f.id === z.id);
        return { picked: z, zone, spec: zone ? zoneSpec(zone, z.treatment) : null };
      });

      const plan = specs
        .map(({ picked, spec }) =>
          picked.treatment === "botox"
            ? `${picked.label}: botulinum toxin ${picked.dose} units${spec ? ` (${spec.effect})` : ""}`
            : `${picked.label}: hyaluronic acid filler ${picked.dose} ml${spec ? ` (${spec.effect})` : ""}`,
        )
        .join("; ");

      const responseFactor = GOAL_RESPONSE[data.goal] ?? GOAL_RESPONSE["balanced"] ?? 0.8;

      // Dosimetry stays here — it is the clinic's own clinical calibration. It
      // now drives the geometric warp on our MALI service instead of a prompt.
      const zones = specs.map(({ picked, spec }) => {
        const strength = spec ? effectStrength(spec, picked.dose) * responseFactor : 0.6;
        return {
          id: picked.id,
          label: picked.label,
          treatment: picked.treatment,
          dose: picked.dose,
          strength: strength > 1 ? strength / 100 : strength,
          ...(spec ? { anatomy: spec.anatomy, cannot: spec.cannot } : {}),
          ...(spec ? { band: doseBand(spec, picked.dose), typical: typicalRangeLabel(spec) } : {}),
        };
      });


      const { renderAestheticPreview } = await import("@/lib/mali-aesthetic.server");
      let result: { ok: true; preview: PreviewShape } | { ok: false; error: string } =
        await renderAestheticPreview({
        dataUrl,
        zones,
        goal: data.goal,
        age: data.age ?? "",
        gender: data.gender ?? "",
        notes: data.notes ?? "",
      });

      // Never leave the patient with nothing: if our own engine is offline or
      // not connected, fall back to the AI simulation using the same dosimetry.
      if (!result.ok) {
        const { renderAiFallbackPreview } = await import("@/lib/aesthetic-fallback.server");
        const fallback = await renderAiFallbackPreview({
          apiKey,
          dataUrl,
          ...(data.maskImage ? { maskDataUrl: data.maskImage } : {}),
          zones,
          goal: data.goal,
          age: data.age ?? "",
          gender: data.gender ?? "",
          notes: data.notes ?? "",
        });
        if (fallback.ok) result = fallback;
      }

      if (!result.ok) {
        await refund();
        return { ok: false as const, error: result.error };
      }

      const notes = await explainPlan(apiKey, data, plan);


      return {
        ok: true as const,
        afterImage: result.preview.afterImage,
        notes,
        plan: data.zones,
        charged,
        engine: result.preview.engine,
        engineVersion: result.preview.engineVersion,
        stages: result.preview.stages,
        masked: Boolean(data.maskImage),
      };
    } catch (error) {
      console.error("[aesthetic-ai] unexpected", error);
      await refund();
      return { ok: false as const, error: "Something went wrong. Your credit was not used." };
    }
  });

async function explainPlan(
  apiKey: string,
  data: { zones: PredictionZone[]; goal: string; age: string; lang?: string },
  plan: string,
) {
  try {
    const { callGateway, parseJsonContent, CHAT_MODEL } = await import("@/lib/ai-gateway.server");
    const call = await callGateway(
      apiKey,
      {
        model: CHAT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              "You are MALI, the aesthetic planning robot at 888clinic clinic.",
              `Treatment plan: ${plan}. Desired style: ${data.goal}. Patient age: ${data.age || "unknown"}.`,
              'Return STRICT JSON: {"expected": [string] (3-5 short bullets on the realistic change per area),',
              '"outcomeRange": {"conservative": string, "typical": string, "maximal": string}',
              "(one short sentence each: the least, most likely, and best-case visible result for this exact plan — patients respond differently so all three are possible),",
              '"timeline": string (1-2 sentences on onset and how long results last),',
              '"cautions": [string] (2-3 short honest cautions or limitations)}',
              "Be honest and slightly conservative; never promise a guaranteed result. Plain language, no diagnosis, no pricing.",
              data.lang === "th"
                ? "Write EVERY string value in natural, friendly, everyday Thai as a Bangkok aesthetic clinic would speak to a patient (polite ค่ะ particles, no stiff textbook translation, no English words except product names). JSON keys stay in English."
                : "Write in plain English.",
            ].join(" "),
          },
        ],
      },
      "aesthetic-plan",
    );
    if (!call.ok) return null;
    const parsed = parseJsonContent(call.data);
    if (!parsed) return null;
    const range = (parsed["outcomeRange"] ?? {}) as Record<string, unknown>;

    return {
      expected: Array.isArray(parsed["expected"])
        ? (parsed["expected"] as unknown[]).slice(0, 6).map((v) => String(v).slice(0, 240))
        : [],
      outcomeRange: {
        conservative: String(range["conservative"] ?? "").slice(0, 240),
        typical: String(range["typical"] ?? "").slice(0, 240),
        maximal: String(range["maximal"] ?? "").slice(0, 240),
      },
      timeline: String(parsed["timeline"] ?? "").slice(0, 400),
      cautions: Array.isArray(parsed["cautions"])
        ? (parsed["cautions"] as unknown[]).slice(0, 4).map((v) => String(v).slice(0, 240))
        : [],
    };

  } catch {
    return null;
  }
}
