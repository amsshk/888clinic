import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const describeSchema = z.object({
  storagePath: z.string().trim().min(1).max(500),
  kind: z.enum(["photo", "video"]),
  hint: z.string().trim().max(300).optional().default(""),
});

const MAX_INLINE_BYTES = 9_000_000;

type Described = {
  title: string;
  description: string;
  alt_text: string;
  tags: string[];
};

export const describeMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => describeSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; result: Described } | { ok: false; error: string }> => {
    const { supabase, userId } = context;

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) return { ok: false, error: "You don't have access to the media library." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI is not configured for this project." };

    const { data: file, error: dlError } = await supabase.storage.from("media").download(data.storagePath);
    if (dlError || !file) {
      return { ok: false, error: "Could not read the uploaded file." };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = file.type || (data.kind === "video" ? "video/mp4" : "image/jpeg");

    const instruction = [
      "You write website copy for 888clinic, a modern dermatology and aesthetic skin clinic.",
      "Look at the media and return JSON with keys: title, description, alt_text, tags.",
      "title: max 60 characters, elegant, no emojis.",
      "description: 2 short sentences, warm and clinical, suitable for a clinic gallery.",
      "alt_text: one factual sentence describing what is visible, for accessibility and SEO.",
      "tags: 3-6 short lowercase keywords.",
      "Never state a medical diagnosis or promise results.",
      data.hint ? `Context from the clinic: ${data.hint}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const content: Array<Record<string, unknown>> = [{ type: "text", text: instruction }];

    if (bytes.byteLength <= MAX_INLINE_BYTES) {
      const base64 = base64Encode(bytes);
      const dataUrl = `data:${mime};base64,${base64}`;
      content.push(
        data.kind === "video"
          ? { type: "video_url", video_url: { url: dataUrl } }
          : { type: "image_url", image_url: { url: dataUrl } },
      );
    } else {
      content[0] = {
        type: "text",
        text: `${instruction} The file could not be attached; write generic clinic-appropriate copy for a ${data.kind} named "${data.storagePath.split("/").pop()}".`,
      };
    }

    const { callGateway, CHAT_MODEL } = await import("@/lib/ai-gateway.server");

    const call = await callGateway(
      apiKey,
      {
        model: CHAT_MODEL,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      },
      "media-describe",
    );

    if (!call.ok) {
      return { ok: false, error: call.error };
    }

    const payload = call.data as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";


    try {
      const parsed = JSON.parse(raw) as Partial<Described>;
      return {
        ok: true,
        result: {
          title: String(parsed.title ?? "").slice(0, 120),
          description: String(parsed.description ?? "").slice(0, 1000),
          alt_text: String(parsed.alt_text ?? "").slice(0, 300),
          tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).slice(0, 30)).slice(0, 8) : [],
        },
      };
    } catch {
      return { ok: false, error: "AI returned an unexpected response. Please try again." };
    }
  });

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
