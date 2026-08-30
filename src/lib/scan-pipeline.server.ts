/**
 * The shared MALI-first scan pipeline.
 *
 * Both the patient scan (`analyzeSkinScan`) and the admin scan test mode
 * (`runScanTest`) call this, so what the test mode verifies is byte-for-byte
 * the same reasoning path the live report uses.
 */

import { escalateUrgency, maliVerdict, normalizeProbs } from "@/lib/mali-decision";

export type PipelineInput = {
  apiKey: string;
  dataUrl: string;
  bodyArea: string;
  concern: string;
  lang?: "en" | "th";
  /** Browser-side ONNX reading, only trusted when the version is the live one. */
  clientMali?: { melanoma: number; nevus: number; seborrheicKeratosis: number; modelVersion: string } | null;
};

export type PipelineOutput =
  | {
      ok: true;
      condition: string;
      confidence: number;
      severity: string;
      urgency: string;
      summary: string;
      findings: Array<{ label: string; detail: string }>;
      recommendations: string[];
      probs: { melanoma: number; nevus: number; seborrheicKeratosis: number } | null;
      modelVersion: string | null;
      maliPrimary: boolean;
    }
  | { ok: false; error: string };

export async function runScanPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const { getMaliOpinion } = await import("@/lib/mali-inference.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let probs: { melanoma: number; nevus: number; seborrheicKeratosis: number } | null = null;
  let modelVersion: string | null = null;

  const hosted = await getMaliOpinion(input.dataUrl);
  if (hosted) {
    probs = normalizeProbs({
      melanoma: hosted.melanoma,
      seborrheicKeratosis: hosted.seborrheicKeratosis,
    });
    modelVersion = hosted.modelVersion;
  } else if (input.clientMali) {
    const { data: active } = await supabaseAdmin
      .from("mali_models")
      .select("version")
      .eq("is_active", true)
      .maybeSingle();
    if (active && active.version === input.clientMali.modelVersion) {
      probs = normalizeProbs(input.clientMali);
      modelVersion = active.version;
    }
  }

  const verdict = probs ? maliVerdict(probs) : null;

  // Availability rule: if the clinic's own service is CONFIGURED but gave no
  // verdict, we fail closed unless an admin allowed the fallback (that is a
  // real outage of a model we trust). If no service is configured at all, the
  // scanner stays open on the screening-aid reading so patients are never
  // turned away.
  if (!verdict) {
    const { maliConfigured } = await import("@/lib/mali-aesthetic.server");
    if (maliConfigured()) {
      const { languageModelFallbackAllowed } = await import("@/lib/engine-settings.server");
      if (!(await languageModelFallbackAllowed())) {
        return {
          ok: false,
          error:
            input.lang === "th"
              ? "ระบบสแกนผิวของคลินิกขัดข้องชั่วคราว จึงยังไม่ได้ใช้สิทธิ์สแกนของคุณ กรุณาลองใหม่อีกครั้งในอีกสักครู่นะคะ"
              : "Our clinical scanner is offline right now, so we did not use your scan. Please try again shortly.",
        };
      }
    }
  }



  const instruction = [
    "You are MALI, the AI skin scanner for 888clinic clinic.",
    verdict
      ? `Our own trained lesion classifier has already read this photo. ${verdict.briefing} Treat that reading as the diagnosis: your job is only to describe the lesion and write patient-friendly wording consistent with it. Do not contradict it.`
      : "",
    "Assess the skin photo and return STRICT JSON with keys:",
    '{"condition": string, "confidence": number 0-1, "severity": "mild"|"moderate"|"severe"|"unclear",',
    '"urgency": "routine"|"soon"|"urgent", "summary": string (2-3 sentences, plain language),',
    '"findings": [{"label": string, "detail": string}] (2-4 items describing visible features),',
    '"recommendations": [string] (3-5 practical next steps: the type of 888clinic skincare products that suit this skin (e.g. gentle cleanser, barrier moisturiser, retinoid, SPF 50) and whether the patient should book a clinic consultation)}',
    "Never claim certainty. If the image is unsuitable, set condition to 'Image not assessable' and confidence 0.",
    input.bodyArea ? `Body area reported by patient: ${input.bodyArea}.` : "",
    input.concern ? `Patient concern: ${input.concern}.` : "",
    input.lang === "th"
      ? "Write EVERY patient-facing string value in natural, clear, everyday Thai, using polite clinic wording with ค่ะ where appropriate. Avoid stiff literal translation and avoid English unless it is a medical term patients commonly know. JSON keys must remain in English."
      : "Write all patient-facing string values in plain English.",
  ]
    .filter(Boolean)
    .join(" ");

  const { callGateway, parseJsonContent, CHAT_MODEL } = await import("@/lib/ai-gateway.server");

  const call = await callGateway(
    input.apiKey,
    {
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: input.dataUrl } },
          ],
        },
      ],
    },
    "scan-pipeline",
  );

  if (!call.ok) return { ok: false, error: input.lang === "th" ? "ระบบ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ" : call.error };

  const parsed = parseJsonContent(call.data);
  if (!parsed) {
    return { ok: false, error: input.lang === "th" ? "ระบบตอบกลับไม่สมบูรณ์ กรุณาลองใหม่อีกครั้งนะคะ" : "The AI returned an unexpected response. Please try again." };
  }


  const findings = Array.isArray(parsed["findings"])
    ? (parsed["findings"] as Array<Record<string, unknown>>).slice(0, 5).map((f) => ({
        label: String(f["label"] ?? (input.lang === "th" ? "สิ่งที่พบ" : "Finding")).slice(0, 80),
        detail: String(f["detail"] ?? "").slice(0, 400),
      }))
    : [];
  const recommendations = Array.isArray(parsed["recommendations"])
    ? (parsed["recommendations"] as unknown[]).slice(0, 6).map((r) => String(r).slice(0, 300))
    : [];

  return {
    ok: true,
    condition: verdict ? verdict.condition : String(parsed["condition"] ?? "Unclear finding").slice(0, 160),
    confidence: verdict ? verdict.confidence : Math.max(0, Math.min(1, Number(parsed["confidence"] ?? 0))),
    severity: verdict ? verdict.severity : String(parsed["severity"] ?? "unclear").slice(0, 30),
    urgency: verdict
      ? escalateUrgency(verdict.urgency, probs?.melanoma ?? 0)
      : String(parsed["urgency"] ?? "routine").slice(0, 30),
    summary: String(parsed["summary"] ?? "").slice(0, 2000),
    findings,
    recommendations,
    probs,
    modelVersion,
    maliPrimary: Boolean(verdict),
  };
}
