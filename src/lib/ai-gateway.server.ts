/**
 * Single entry point for every AI call the clinic makes (the clinic's own OpenAI account).
 *
 * Why this exists: the scan and the before/after preview are the two things a
 * patient pays for, so a transient hiccup must never look like a broken tool.
 * Retryable statuses (429 / 5xx) are retried with bounded backoff; everything
 * else is terminal and is surfaced as a plain-language message the patient can
 * act on, while the technical detail stays in the server log.
 */

export const CHAT_MODEL = "openai/gpt-5.6-sol";
export const IMAGE_MODEL = "google/gemini-3.1-flash-image";
/**
 * The before/after preview is the paid, identity-critical render, so it uses
 * the highest-fidelity editing model rather than the fast one.
 */
export const PREVIEW_IMAGE_MODEL = "google/gemini-3-pro-image";

const MAX_ATTEMPTS = 3;

export type GatewayResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

function patientMessage(status: number) {
  if (status === 429)
    return "The AI provider rejected the request because of an account credit, usage, or rate limit. Check the provider dashboard, then try again.";
  if (status === 402 || status === 403)
    return "The AI scanner is temporarily unavailable. Please contact the clinic — you were not charged.";
  if (status === 400) return "We could not read that photo. Please upload a clear, well-lit photo.";
  return "The analysis failed. Please try again — you were not charged.";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a chat/completions body to the clinic's OpenAI account. Image requests go to
 * OpenAI's image edit endpoint. No artificial timeout: image and reasoning passes
 * legitimately take a while and the waiting UI covers it.
 *
 * `_apiKey` is kept for call-site compatibility and is not used.
 */
export async function callGateway(
  _apiKey: string,
  body: Record<string, unknown>,
  label: string,
): Promise<GatewayResult<Record<string, unknown>>> {
  const { openaiKey, openaiChat, openaiImageEdit, wantsImage, hasVideoPart } =
    await import("@/lib/openai.server");
  if (!openaiKey()) {
    console.error(`[${label}] OPENAI_API_KEY is not configured`);
    return { ok: false, status: 503, error: patientMessage(503) };
  }
  if (hasVideoPart(body)) {
    // OpenAI chat cannot read video; callers send a still frame instead.
    return { ok: false, status: 400, error: "Video analysis is not available. Use a photo or a still frame." };
  }
  const image = wantsImage(body);
  let lastStatus = 500;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = image ? await openaiImageEdit(body, label) : await openaiChat(body, label);
    if (result.ok) return { ok: true, data: result.data };
    lastStatus = result.status;
    const retryable = result.status === 429 || result.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(attempt * 1500);
  }
  return { ok: false, status: lastStatus, error: patientMessage(lastStatus) };
}

/** Pull the first JSON object out of a chat completion, tolerating code fences. */
export function parseJsonContent(payload: Record<string, unknown>): Record<string, unknown> | null {
  const choices = payload["choices"] as Array<{ message?: { content?: string } }> | undefined;
  const raw = choices?.[0]?.message?.content ?? "";
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Pull the generated image out of an image-capable chat completion. */
export function parseImageContent(payload: Record<string, unknown>): string | null {
  const choices = payload["choices"] as
    Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> | undefined;
  const url = choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
  return url.startsWith("data:image/") ? url : null;
}
