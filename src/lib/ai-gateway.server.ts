/**
 * Single entry point for every Lovable AI Gateway call the clinic makes.
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


const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_ATTEMPTS = 3;

export type GatewayResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

function patientMessage(status: number) {
  if (status === 429) return "Our AI is busy right now — please try again in a moment.";
  if (status === 402 || status === 403)
    return "The AI scanner is temporarily unavailable. Please contact the clinic — you were not charged.";
  if (status === 400) return "We could not read that photo. Please upload a clear, well-lit photo.";
  return "The analysis failed. Please try again — you were not charged.";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST a chat/completions body to the gateway. No artificial timeout: image and
 * reasoning passes legitimately take a while and the waiting UI covers it.
 */
export async function callGateway(
  apiKey: string,
  body: Record<string, unknown>,
  label: string,
): Promise<GatewayResult<Record<string, unknown>>> {
  let lastStatus = 500;

  const { openaiKey, openaiChat, openaiImageEdit, wantsImage, hasVideoPart } = await import(
    "@/lib/openai.server"
  );
  // `mask` is an OpenAI-only edit field; the Lovable gateway body must not carry it.
  const { mask: _mask, ...gatewayBody } = body;
  // The clinic's own OpenAI account is the primary provider; video understanding
  // is the one capability it cannot serve, so that stays on the Lovable gateway.
  const useOpenai = Boolean(openaiKey()) && !hasVideoPart(body);
  const openaiImage = useOpenai && wantsImage(body);


  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response;

    if (useOpenai) {
      const result = openaiImage
        ? await openaiImageEdit(body, label)
        : await openaiChat(body, label);
      if (result.ok) return { ok: true, data: result.data };

      lastStatus = result.status;
      const retryable = result.status === 429 || result.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(attempt * 1500);
      continue;
    }

    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify(gatewayBody),
      });
    } catch (error) {
      console.error(`[${label}] gateway unreachable`, error);
      lastStatus = 503;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1500);
        continue;
      }
      return { ok: false, status: lastStatus, error: patientMessage(lastStatus) };
    }


    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!payload) {
        return { ok: false, status: 502, error: patientMessage(502) };
      }
      return { ok: true, data: payload };
    }

    lastStatus = response.status;
    const detail = await response.text().catch(() => "");
    console.error(`[${label}] gateway ${response.status}`, detail.slice(0, 400));

    // Only 429 and 5xx are worth another attempt; the rest repeat identically.
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;

    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await sleep(retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : attempt * 1500);
  }

  return { ok: false, status: lastStatus, error: patientMessage(lastStatus) };
}

/** Pull the first JSON object out of a chat completion, tolerating code fences. */
export function parseJsonContent(payload: Record<string, unknown>): Record<string, unknown> | null {
  const choices = payload["choices"] as Array<{ message?: { content?: string } }> | undefined;
  const raw = choices?.[0]?.message?.content ?? "";
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
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
    | Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>
    | undefined;
  const url = choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
  return url.startsWith("data:image/") ? url : null;
}
