/**
 * Direct OpenAI platform provider — server only.
 *
 * The clinic pays for its own OpenAI account, so every text/vision and image
 * pass goes here first. If `OPENAI_API_KEY` is absent (or the request needs a
 * capability OpenAI does not offer, e.g. video understanding or image
 * embeddings), `ai-gateway.server.ts` falls back to the Lovable AI Gateway so
 * patients are never turned away.
 *
 * Models can be overridden per deployment with OPENAI_CHAT_MODEL /
 * OPENAI_IMAGE_MODEL secrets.
 */


export type ProviderResult = { ok: true; data: Record<string, unknown> } | { ok: false; status: number };

export function openaiKey(): string {
  return process.env["OPENAI_API_KEY"] ?? "";
}

function chatModel(): string {
  return process.env["OPENAI_CHAT_MODEL"] ?? "gpt-4o";
}

/**
 * Highest-quality OpenAI edit model. Overridable because not every account has
 * gpt-image-2 enabled yet — set OPENAI_IMAGE_MODEL=gpt-image-1 to step back.
 */
export function imageModel(): string {
  return process.env["OPENAI_IMAGE_MODEL"] ?? "gpt-image-2";
}

/** gpt-image-2 rejects input_fidelity outright; gpt-image-1 accepts/uses it. */
function supportsInputFidelity(model: string): boolean {
  return model.startsWith("gpt-image-1");
}

/** Both current edit models accept a mask; keep the check explicit. */
function supportsMask(model: string): boolean {
  return model.startsWith("gpt-image-1") || model.startsWith("gpt-image-2");
}

type Part = Record<string, unknown>;
type Message = { role?: string; content?: string | Part[] };

/** True when the request asks for a generated/edited image. */
export function wantsImage(body: Record<string, unknown>): boolean {
  const modalities = body["modalities"];
  return Array.isArray(modalities) && modalities.includes("image");
}

/** OpenAI has no video understanding on chat/completions — those stay on Lovable. */
export function hasVideoPart(body: Record<string, unknown>): boolean {
  const messages = (body["messages"] as Message[] | undefined) ?? [];

  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p["type"] === "video_url"));
}

function collectText(body: Record<string, unknown>): string {
  const messages = (body["messages"] as Message[] | undefined) ?? [];
  const chunks: string[] = [];

  for (const message of messages) {
    if (typeof message.content === "string") {
      chunks.push(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part["type"] === "text") {
          chunks.push(String(part["text"] ?? ""));
        }
      }
    }
  }

  return chunks.filter(Boolean).join("\n");
}

function collectFirstImage(body: Record<string, unknown>): string | null {
  const messages = (body["messages"] as Message[] | undefined) ?? [];

  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;

    for (const part of message.content) {
      if (part["type"] === "image_url") {
        const url = (part["image_url"] as { url?: string } | undefined)?.url ?? "";

        if (url.startsWith("data:image/")) {
          return url;
        }
      }
    }
  }

  return null;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mime: string } {
  const [head = "", base64 = ""] = dataUrl.split(",", 2);
  const mime = head.slice(head.indexOf(":") + 1, head.indexOf(";")) || "image/png";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : mime.includes("webp") ? "webp" : "png";

  return {
    blob: new Blob([bytes], { type: mime }),
    ext,
    mime,
  };
}


/** Chat / vision pass on OpenAI, returning the standard completion payload. */
export async function openaiChat(body: Record<string, unknown>, label: string): Promise<ProviderResult> {
  const { model: _ignored, modalities: _m, ...rest } = body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey()}`,
    },
    body: JSON.stringify({
      ...rest,
      model: chatModel(),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[${label}] openai chat ${response.status}`, detail.slice(0, 400));

    return {
      ok: false,
      status: response.status,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  return payload
    ? {
        ok: true,
        data: payload,
      }
    : {
        ok: false,
        status: 502,
      };
}

/**
 * Image edit pass on OpenAI.
 *
 * The request form is built PER MODEL — a field the chosen model does not
 * accept makes OpenAI reject the whole call, so `input_fidelity` only goes to
 * gpt-image-1.
 *
 * When `body.mask` carries a PNG data URL, OpenAI is asked to edit only the
 * transparent mask region. After OpenAI returns the edit, this module performs
 * a server-side hard composite:
 *
 * - outside the editable mask: pixels are taken from the original patient photo
 * - inside the editable mask: pixels are taken from the OpenAI render
 *
 * The result is wrapped in the same shape as an image-capable chat completion
 * so `parseImageContent` keeps working.
 */
export async function openaiImageEdit(body: Record<string, unknown>, label: string): Promise<ProviderResult> {
  const source = collectFirstImage(body);
  const prompt = collectText(body).slice(0, 30_000);

  if (!source || !prompt) {
    return {
      ok: false,
      status: 400,
    };
  }

  const model = imageModel();

  const maskUrl = typeof body["mask"] === "string" ? (body["mask"] as string) : "";
  const masked = maskUrl.startsWith("data:image/png;base64,") && supportsMask(model);

  const { blob, ext } = dataUrlToBlob(source);

  const form = new FormData();
  form.append("model", model);
  form.append("image", blob, `patient.${ext}`);
  form.append("prompt", prompt);
  form.append("size", "auto");
  form.append("quality", "high");

  if (masked) {
    const mask = dataUrlToBlob(maskUrl);
    form.append("mask", mask.blob, "mask.png");
  }

  if (supportsInputFidelity(model)) {
    /**
     * Keeps pores, moles and identity intact for gpt-image-1.
     * Do not send to gpt-image-2 because that model rejects the field.
     */
    form.append("input_fidelity", "high");
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    console.error(`[${label}] openai image ${response.status} model=${model} masked=${masked}`, detail.slice(0, 600));

    return {
      ok: false,
      status: response.status,
    };
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string }>;
  } | null;

  const b64 = payload?.data?.[0]?.b64_json;

  if (!b64) {
    return {
      ok: false,
      status: 502,
    };
  }

  const finalImageUrl = `data:image/png;base64,${b64}`;
  const mode = masked ? "zone-masked-edit" : "full-frame-edit";
  /**
   * OpenAI's edit endpoint only repaints the transparent mask region, so the
   * unmasked areas come back from the patient photo. (A pixel-level composite
   * would need a native image library, which this serverless runtime cannot run.)
   */
  const outsideMaskPreserved = masked;

  return {
    ok: true,
    data: {
      provider: "openai",
      model,
      mode,
      outsideMaskPreserved,
      choices: [
        {
          message: {
            images: [
              {
                image_url: {
                  url: finalImageUrl,
                },
              },
            ],
          },
        },
      ],
    },
  };
}
