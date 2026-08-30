/**
 * MALI lesion-classifier second opinion.
 *
 * The trained model lives outside this app (the Cloudflare Worker runtime cannot
 * load ONNX/PyTorch weights). It is served over HTTP by the inference container
 * in `ml/mali/serve/` and reached here with a bearer token.
 *
 * The contract is:
 *   POST {MALI_API_URL}/v1/lesion   { "image": "data:image/jpeg;base64,..." }
 *   -> { "melanoma": 0.0-1.0, "seborrheic_keratosis": 0.0-1.0, "model_version": "..." }
 *
 * This is always optional: if the secrets are missing or the endpoint fails,
 * the scan continues on the Gemini result alone.
 */

export type MaliOpinion = {
  melanoma: number;
  seborrheicKeratosis: number;
  modelVersion: string;
};

const clamp01 = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
};

export async function getMaliOpinion(dataUrl: string): Promise<MaliOpinion | null> {
  const baseUrl = process.env["MALI_API_URL"];
  const apiKey = process.env["MALI_API_KEY"];
  if (!baseUrl || !apiKey) return null;

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/lesion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ image: dataUrl }),
    });

    if (!response.ok) {
      console.error("[mali] inference error", response.status, await response.text());
      return null;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const version = String(payload["model_version"] ?? "unknown").slice(0, 60);

    return {
      melanoma: clamp01(payload["melanoma"]),
      seborrheicKeratosis: clamp01(payload["seborrheic_keratosis"]),
      modelVersion: version,
    };
  } catch (error) {
    console.error("[mali] inference unavailable", error);
    return null;
  }
}

/** Urgency can only be raised by MALI, never lowered. */
const URGENCY_RANK: Record<string, number> = { routine: 0, soon: 1, urgent: 2 };

export function escalateUrgency(current: string, melanomaProb: number): string {
  const suggested = melanomaProb >= 0.7 ? "urgent" : melanomaProb >= 0.4 ? "soon" : "routine";
  const now = URGENCY_RANK[current] ?? 0;
  const next = URGENCY_RANK[suggested] ?? 0;
  return next > now ? suggested : current;
}
