import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdVariant, MarketingVideoStatus } from "@/lib/marketing-ai.shared";

type MarketingContext = { supabase: SupabaseClient; userId: string };

async function requireAdmin(context: MarketingContext): Promise<boolean> {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return Boolean(data);
}

function openAiKey(): string {
  return process.env["OPENAI_API_KEY"] ?? "";
}

export async function createAdCopy(
  data: {
    objective: string;
    offer: string;
    audience: string;
    language: "en" | "th" | "both";
    tone: string;
    placement: string;
    variants: number;
  },
  context: MarketingContext,
): Promise<{ ok: true; variants: AdVariant[] } | { ok: false; error: string }> {
  if (!(await requireAdmin(context))) return { ok: false, error: "Marketing tools are admin-only." };

  const instruction = [
    "You are a senior performance marketer writing Meta (Facebook + Instagram) ads for 888clinic, a modern dermatology and aesthetic skin clinic in Bangkok, Thailand.",
    "Brand: gold, grey and white, quiet luxury, real dermatologists, real patient results, an AI skin scanner called MALI (a robot) that reads a skin photo and can preview botox and filler outcomes.",
    `Campaign objective: ${data.objective}.`,
    data.offer ? `Offer / product to promote: ${data.offer}.` : "",
    data.audience ? `Target audience: ${data.audience}.` : "",
    `Tone: ${data.tone}. Placement: ${data.placement}.`,
    `Return STRICT JSON: {"variants":[{"angle":string,"primaryTextEn":string,"headlineEn":string,"descriptionEn":string,"primaryTextTh":string,"headlineTh":string,"descriptionTh":string,"cta":string,"hashtags":[string],"creativeIdea":string}]} with exactly ${data.variants} variants, each a different angle.`,
    "primaryText: max 125 characters of hook plus 1-2 short lines. headline: max 40 characters. description: max 30 characters. cta: one of Book Now, Learn More, Sign Up, Send Message, Shop Now.",
    "Thai copy must read like a real Bangkok clinic page — friendly, natural, uses ค่ะ / นะคะ, everyday wording, never a stiff textbook translation.",
    data.language === "en"
      ? "Leave the Thai fields as empty strings."
      : data.language === "th"
        ? "Leave the English fields as empty strings."
        : "Fill both English and Thai fields.",
    "creativeIdea: one sentence describing the image or video to pair with it.",
    "Meta ad policy: no guaranteed results, diagnosis, body or skin shaming, personal-attribute targeting, percentages, cure claims, or exaggerated superlatives.",
    "hashtags: 3-6 short mixed Thai/English tags without spaces.",
  ].filter(Boolean).join(" ");

  const { callGateway, parseJsonContent, CHAT_MODEL } = await import("@/lib/ai-gateway.server");
  const call = await callGateway(
    process.env["LOVABLE_API_KEY"] ?? "",
    {
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: instruction }],
    },
    "marketing-adcopy",
  );
  if (!call.ok) return { ok: false, error: call.error };

  const parsed = parseJsonContent(call.data);
  const rows = Array.isArray(parsed?.["variants"]) ? (parsed["variants"] as unknown[]) : [];
  if (!rows.length) return { ok: false, error: "The AI returned an unexpected response. Please try again." };
  const text = (value: unknown, max: number) => String(value ?? "").slice(0, max);
  return {
    ok: true,
    variants: rows.slice(0, 5).map((row) => {
      const value = row as Record<string, unknown>;
      return {
        angle: text(value["angle"], 80),
        primaryTextEn: text(value["primaryTextEn"], 900),
        headlineEn: text(value["headlineEn"], 120),
        descriptionEn: text(value["descriptionEn"], 120),
        primaryTextTh: text(value["primaryTextTh"], 900),
        headlineTh: text(value["headlineTh"], 120),
        descriptionTh: text(value["descriptionTh"], 120),
        cta: text(value["cta"], 40),
        hashtags: Array.isArray(value["hashtags"])
          ? (value["hashtags"] as unknown[]).slice(0, 8).map((tag) => text(tag, 40))
          : [],
        creativeIdea: text(value["creativeIdea"], 400),
      };
    }),
  };
}

export async function startVideoGeneration(
  data: {
    objective: string;
    offer: string;
    audience: string;
    prompt: string;
    duration: "4" | "8" | "12";
    format: "vertical" | "square" | "landscape";
  },
  context: MarketingContext,
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  if (!(await requireAdmin(context))) return { ok: false, error: "Marketing tools are admin-only." };
  const key = openAiKey();
  if (!key) return { ok: false, error: "OpenAI video generation is not connected yet." };

  const size = data.format === "vertical" ? "720x1280" : data.format === "square" ? "1024x1024" : "1280x720";
  const form = new FormData();
  form.append("model", process.env["OPENAI_VIDEO_MODEL"] ?? "sora-2");
  form.append("seconds", data.duration);
  form.append("size", size);
  form.append(
    "prompt",
    [
      "Create a polished social advertisement for 888clinic, a modern dermatology and aesthetic clinic in Bangkok.",
      "Premium white, cool grey and subtle gold visual identity. Realistic Thai people, natural skin texture, clean clinical lighting.",
      `Campaign objective: ${data.objective}.`,
      data.offer ? `Offer: ${data.offer}.` : "",
      data.audience ? `Audience context: ${data.audience}.` : "",
      data.prompt,
      "No generated text, logos, needles, graphic procedures, guaranteed outcomes, diagnosis, or unrealistic before-and-after transformation. Leave safe negative space for captions.",
    ].filter(Boolean).join(" "),
  );

  const response = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const payload = (await response.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.id) {
    console.error("[marketing-video] OpenAI start failed", response.status, payload?.error?.message ?? "");
    return { ok: false, error: "OpenAI could not start the video. Check video-model access and try again." };
  }
  return { ok: true, jobId: payload.id };
}

export async function readVideoGeneration(
  jobId: string,
  context: MarketingContext,
): Promise<MarketingVideoStatus> {
  if (!(await requireAdmin(context))) return { ok: false, error: "Marketing tools are admin-only." };
  const key = openAiKey();
  if (!key) return { ok: false, error: "OpenAI video generation is not connected yet." };

  const response = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const job = (await response.json().catch(() => null)) as {
    status?: string;
    progress?: number;
    error?: { message?: string };
  } | null;
  if (!response.ok || !job) return { ok: false, error: "Could not check the video status." };
  if (job.status === "failed") return { ok: false, error: job.error?.message ?? "Video generation failed." };
  if (job.status !== "completed") {
    return {
      ok: true,
      status: job.status === "in_progress" ? "in_progress" : "queued",
      progress: Math.max(0, Math.min(99, Number(job.progress) || 0)),
    };
  }

  const videoResponse = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(jobId)}/content`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!videoResponse.ok) return { ok: false, error: "The video finished but could not be downloaded." };
  const bytes = await videoResponse.arrayBuffer();
  const storagePath = `${context.userId}/marketing/${Date.now()}-${jobId.replace(/[^a-zA-Z0-9_-]/g, "")}.mp4`;
  const { error: uploadError } = await context.supabase.storage
    .from("media")
    .upload(storagePath, bytes, { contentType: "video/mp4", upsert: false });
  if (uploadError) return { ok: false, error: "The video finished but could not be saved to the media library." };

  const { data: signed, error: signedError } = await context.supabase.storage
    .from("media")
    .createSignedUrl(storagePath, 60 * 60 * 24);
  if (signedError || !signed?.signedUrl) return { ok: false, error: "The video was saved but its preview could not be opened." };
  return { ok: true, status: "completed", videoUrl: signed.signedUrl };
}