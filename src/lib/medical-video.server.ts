import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHAT_MODEL, callGateway, parseJsonContent } from "@/lib/ai-gateway.server";
import {
  createPrivateMediaSignedUrl,
  downloadOpenAiVideoBytes,
  getOpenAiVideoJobState,
  marketingComplianceRules,
  startOpenAiVideoJob,
  uploadPrivateMediaAsset,
  type VideoGenerationInput,
} from "@/lib/marketing-ai.server";
import type {
  MedicalNarrationSegment,
  MedicalSubtitleCue,
  MedicalVideoClipJob,
  MedicalVideoProject,
  MedicalVideoProjectStatus,
  MedicalVideoScenePrompt,
} from "@/lib/medical-video.shared";
import { requireClinicAdmin } from "@/lib/super-admin.server";

type MarketingContext = {
  supabase: SupabaseClient;
  userId: string;
  claims?: Record<string, unknown>;
};

type RawProjectRow = {
  id: string;
  topic: string;
  format: "vertical" | "square" | "landscape";
  status: MedicalVideoProjectStatus;
  script: string | null;
  scenes: unknown;
  clip_jobs: unknown;
  narration_segments: unknown;
  subtitle_cues: unknown;
  final_video_path: string | null;
  approved: boolean | null;
  approved_at: string | null;
  error_message: string | null;
};

const execFileAsync = promisify(execFile);
const TARGET_VIDEO_SECONDS = 48;
const SIGNED_URL_TTL = 60 * 60 * 24;

const ANATOMY_REFERENCE = [
  "Upper-face reference zones: frontalis, corrugator, procerus, orbicularis oculi / crow's feet.",
  "Mid/lower-face reference zones: malar apex, nasolabial fold, vermilion border, pogonion chin projection.",
  "Diagnostic visual language reference: periorbital circulation, hydration, pigmentation, T-zone collagen density, MALI scan overlays.",
].join(" ");

function sceneDurations(sceneCount: number): Array<8 | 12> {
  if (sceneCount <= 4) return [12, 12, 12, 12];
  if (sceneCount === 5) return [8, 8, 8, 12, 12];
  return [8, 8, 8, 8, 8, 8];
}

function toSceneArray(value: unknown): MedicalVideoScenePrompt[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row, index) => {
      const record = row as Record<string, unknown>;
      const anatomy = Array.isArray(record["anatomyFocus"])
        ? (record["anatomyFocus"] as unknown[])
            .map((item) => String(item ?? "").trim())
            .filter(Boolean)
        : [];
      return {
        id: String(record["id"] ?? `scene-${index + 1}`),
        title: String(record["title"] ?? `Scene ${index + 1}`)
          .trim()
          .slice(0, 120),
        anatomyFocus: anatomy.slice(0, 6),
        visualPrompt: String(record["visualPrompt"] ?? "")
          .trim()
          .slice(0, 1600),
        narration: String(record["narration"] ?? "")
          .trim()
          .slice(0, 500),
        clipDurationSeconds: Number(record["clipDurationSeconds"]) >= 12 ? 12 : 8,
      } satisfies MedicalVideoScenePrompt;
    })
    .filter((scene) => scene.visualPrompt && scene.narration && scene.anatomyFocus.length > 0);
}

function toClipArray(value: unknown): MedicalVideoClipJob[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      sceneId: String(record["sceneId"] ?? ""),
      title: String(record["title"] ?? "").slice(0, 120),
      prompt: String(record["prompt"] ?? "").slice(0, 1800),
      durationSeconds: Number(record["durationSeconds"]) >= 12 ? 12 : 8,
      jobId: String(record["jobId"] ?? ""),
      status:
        record["status"] === "completed" ||
        record["status"] === "failed" ||
        record["status"] === "in_progress"
          ? (record["status"] as MedicalVideoClipJob["status"])
          : "queued",
      progress: Math.max(0, Math.min(100, Number(record["progress"]) || 0)),
      storagePath: typeof record["storagePath"] === "string" ? record["storagePath"] : undefined,
      error: typeof record["error"] === "string" ? record["error"] : undefined,
    };
  });
}

function toNarrationArray(value: unknown): MedicalNarrationSegment[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      sceneId: String(record["sceneId"] ?? ""),
      text: String(record["text"] ?? "").slice(0, 500),
      storagePath: String(record["storagePath"] ?? ""),
      durationSeconds: Math.max(0, Number(record["durationSeconds"]) || 0),
    };
  });
}

function toSubtitleArray(value: unknown): MedicalSubtitleCue[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record["id"] ?? ""),
      sceneId: String(record["sceneId"] ?? ""),
      text: String(record["text"] ?? "").slice(0, 240),
      startSeconds: Math.max(0, Number(record["startSeconds"]) || 0),
      endSeconds: Math.max(0, Number(record["endSeconds"]) || 0),
    };
  });
}

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

function buildSubtitleCues(
  scenes: MedicalVideoScenePrompt[],
  narrationSegments: MedicalNarrationSegment[],
): MedicalSubtitleCue[] {
  let cursor = 0;
  return scenes.flatMap((scene, sceneIndex) => {
    const segment = narrationSegments.find((item) => item.sceneId === scene.id);
    const clipSeconds = scene.clipDurationSeconds;
    const maxSubtitleSeconds = Math.min(segment?.durationSeconds ?? clipSeconds, clipSeconds);
    const sentences = splitSentences(segment?.text || scene.narration);
    const totalWeight = sentences.reduce((sum, sentence) => sum + Math.max(1, sentence.length), 0);
    let localStart = cursor;
    const cues = sentences.map((sentence, sentenceIndex) => {
      const weight = Math.max(1, sentence.length);
      const slice =
        sentenceIndex === sentences.length - 1
          ? cursor + maxSubtitleSeconds - localStart
          : (maxSubtitleSeconds * weight) / totalWeight;
      const cue: MedicalSubtitleCue = {
        id: `${scene.id}-${sentenceIndex + 1}`,
        sceneId: scene.id,
        text: sentence,
        startSeconds: Number(localStart.toFixed(2)),
        endSeconds: Number(Math.min(cursor + clipSeconds, localStart + slice).toFixed(2)),
      };
      localStart = cue.endSeconds;
      return cue;
    });
    cursor += clipSeconds;
    return cues.length > 0
      ? cues
      : [
          {
            id: `${scene.id}-1`,
            sceneId: scene.id,
            text: scene.narration,
            startSeconds: Number((cursor - clipSeconds).toFixed(2)),
            endSeconds: Number(cursor.toFixed(2)),
          },
        ];
  });
}

function ttsModel(): string {
  return process.env["OPENAI_TTS_MODEL"] ?? "gpt-4o-mini-tts";
}

function ttsVoice(): string {
  return process.env["OPENAI_TTS_VOICE"] ?? "alloy";
}

function speechError(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (status === 401 || lower.includes("invalid api key"))
    return "The OpenAI API key is invalid or has been revoked. Update OPENAI_API_KEY and try again.";
  if (status === 402 || lower.includes("insufficient") || lower.includes("billing"))
    return "The OpenAI account has no available credit for narration. Add billing, then try again.";
  if (status === 403 || lower.includes("model"))
    return "This OpenAI account cannot use the narration model yet. Update OPENAI_TTS_MODEL or enable access, then try again.";
  return "Could not generate the narration audio.";
}

function wavDurationSeconds(bytes: Uint8Array): number {
  if (bytes.length < 44) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteRate = view.getUint32(28, true);
  if (!byteRate) return 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunkId = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!,
    );
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "data") return chunkSize / byteRate;
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return 0;
}

async function createNarrationAudio(text: string) {
  const key = process.env["OPENAI_API_KEY"] ?? "";
  if (!key) return { ok: false as const, error: "OpenAI narration is not connected yet." };
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model: ttsModel(),
      voice: ttsVoice(),
      input: text,
      response_format: "wav",
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[medical-video] tts failed", response.status, detail.slice(0, 400));
    return { ok: false as const, error: speechError(response.status, detail) };
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    ok: true as const,
    bytes,
    durationSeconds: Number(wavDurationSeconds(bytes).toFixed(2)),
  };
}

function normaliseDraft(parsed: Record<string, unknown>): {
  script: string;
  scenes: MedicalVideoScenePrompt[];
} | null {
  const script = String(parsed["script"] ?? "")
    .trim()
    .slice(0, 2400);
  const rawScenes = Array.isArray(parsed["scenes"]) ? (parsed["scenes"] as unknown[]) : [];
  if (!script || rawScenes.length < 4) return null;
  const durations = sceneDurations(rawScenes.length);
  const scenes = rawScenes.slice(0, 6).map((row, index) => {
    const record = row as Record<string, unknown>;
    const anatomyFocus = Array.isArray(record["anatomyFocus"])
      ? (record["anatomyFocus"] as unknown[])
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
      : [];
    return {
      id: `scene-${index + 1}`,
      title: String(record["title"] ?? `Scene ${index + 1}`)
        .trim()
        .slice(0, 120),
      anatomyFocus: anatomyFocus.slice(0, 6),
      visualPrompt: String(record["visualPrompt"] ?? "")
        .trim()
        .slice(0, 1600),
      narration: String(record["narration"] ?? "")
        .trim()
        .slice(0, 500),
      clipDurationSeconds: durations[index] ?? 8,
    } satisfies MedicalVideoScenePrompt;
  });
  return scenes.every(
    (scene) => scene.visualPrompt && scene.narration && scene.anatomyFocus.length > 0,
  )
    ? { script, scenes }
    : null;
}

async function loadProject(projectId: string, context: MarketingContext) {
  const { data, error } = await context.supabase
    .from("medical_video_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data) return null;
  return data as RawProjectRow;
}

async function persistProject(
  projectId: string,
  patch: Record<string, unknown>,
  context: MarketingContext,
) {
  const { error } = await context.supabase
    .from("medical_video_projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  return !error;
}

async function hydrateProject(
  row: RawProjectRow,
  context: MarketingContext,
): Promise<MedicalVideoProject> {
  const scenes = toSceneArray(row.scenes);
  const clips = await Promise.all(
    toClipArray(row.clip_jobs).map(async (clip) => ({
      ...clip,
      videoUrl: clip.storagePath
        ? ((await createPrivateMediaSignedUrl(context, clip.storagePath, SIGNED_URL_TTL)) ??
          undefined)
        : undefined,
    })),
  );
  const narrationSegments = await Promise.all(
    toNarrationArray(row.narration_segments).map(async (segment) => ({
      ...segment,
      audioUrl: segment.storagePath
        ? ((await createPrivateMediaSignedUrl(context, segment.storagePath, SIGNED_URL_TTL)) ??
          undefined)
        : undefined,
    })),
  );
  return {
    id: row.id,
    topic: row.topic,
    format: row.format,
    status: row.status,
    script: row.script ?? "",
    scenes,
    clips,
    narrationSegments,
    subtitleCues: toSubtitleArray(row.subtitle_cues),
    finalVideoUrl: row.final_video_path
      ? ((await createPrivateMediaSignedUrl(context, row.final_video_path, SIGNED_URL_TTL)) ??
        undefined)
      : undefined,
    approved: row.approved === true,
    approvedAt: row.approved_at,
    error: row.error_message,
  };
}

function sceneVideoInput(
  topic: string,
  format: "vertical" | "square" | "landscape",
  scene: MedicalVideoScenePrompt,
): VideoGenerationInput {
  return {
    objective: "Educational clinic marketing video",
    offer: topic,
    audience: "Adults researching dermatologist-led aesthetic care in Bangkok",
    duration: scene.clipDurationSeconds === 12 ? "12" : "8",
    format,
    prompt: [
      `Medical topic: ${topic}.`,
      `Scene title: ${scene.title}.`,
      `Anatomy focus: ${scene.anatomyFocus.join(", ")}.`,
      scene.visualPrompt,
      "Clinical CGI style, medically grounded anatomy, non-graphic treatment visualization, premium 888clinic aesthetic, no logos or on-screen text, no diagnosis claims, no guaranteed outcomes.",
    ].join(" "),
  };
}

async function renderMedicalPromoVideo(
  project: MedicalVideoProject,
  context: MarketingContext,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  const tmp = await mkdtemp(join(tmpdir(), "medical-video-"));
  const outputPath = join(tmp, "medical-promo.mp4");
  const propsPath = join(tmp, "medical-promo.json");
  try {
    const scenes = project.scenes.map((scene) => {
      const clip = project.clips.find((item) => item.sceneId === scene.id && item.videoUrl);
      const audio = project.narrationSegments.find(
        (item) => item.sceneId === scene.id && item.audioUrl,
      );
      return {
        id: scene.id,
        title: scene.title,
        anatomyFocus: scene.anatomyFocus,
        clipUrl: clip?.videoUrl ?? "",
        narrationUrl: audio?.audioUrl ?? "",
        narration: scene.narration,
        clipDurationSeconds: scene.clipDurationSeconds,
      };
    });
    await writeFile(
      propsPath,
      JSON.stringify({
        topic: project.topic,
        subtitles: project.subtitleCues,
        scenes,
      }),
      "utf8",
    );
    const compId =
      project.format === "square"
        ? "medical-promo-square"
        : project.format === "landscape"
          ? "medical-promo-landscape"
          : "medical-promo-vertical";
    const scriptPath = join(process.cwd(), "remotion", "scripts", "render-remotion.mjs");
    await execFileAsync(process.execPath, [scriptPath, compId, outputPath, propsPath], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024 * 20,
    });
    const bytes = new Uint8Array(await readFile(outputPath));
    const storagePath = `${context.userId}/marketing/medical-video/${project.id}/final-${project.format}.mp4`;
    const uploaded = await uploadPrivateMediaAsset(context, storagePath, bytes, "video/mp4");
    if (!uploaded.ok) return uploaded;
    return { ok: true, storagePath: uploaded.storagePath };
  } catch (error) {
    console.error("[medical-video] remotion render failed", error);
    return {
      ok: false,
      error:
        "Could not render the final MP4. Check the server-side Remotion dependencies and Chromium configuration, then try again.",
    };
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function createMedicalVideoDraft(
  data: { topic: string; format: "vertical" | "square" | "landscape" },
  context: MarketingContext,
): Promise<MedicalVideoProject | { ok: false; error: string }> {
  if (!(await requireClinicAdmin(context)))
    return { ok: false, error: "This AI studio is restricted to clinic administrators." };
  const instruction = [
    "You are writing a medically careful short marketing video for 888clinic, a dermatologist-led aesthetic clinic in Bangkok.",
    `Topic: ${data.topic}.`,
    ANATOMY_REFERENCE,
    marketingComplianceRules(),
    'Return STRICT JSON: {"script":string,"scenes":[{"title":string,"anatomyFocus":[string],"narration":string,"visualPrompt":string}]}.',
    "Create 4 to 6 scenes that together support a 45-50 second vertical social video.",
    "The script and narration must be medically grounded, educational, neutral in tone, and safe for healthcare advertising.",
    "No diagnosis claims, no promises, no guaranteed results, no cure language, no shaming, no graphic needles, and no exaggerated before-and-after claims.",
    "Each scene should have 1 short narration segment and 1 CGI prompt with Thai or Asian facial anatomy where relevant, clean clinical lighting, premium white/grey/gold 888clinic brand direction, and safe caption space.",
  ].join(" ");
  const call = await callGateway(
    process.env["LOVABLE_API_KEY"] ?? "",
    {
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: instruction }],
    },
    "medical-video-draft",
  );
  if (!call.ok) return { ok: false, error: call.error };
  const parsed = parseJsonContent(call.data);
  const draft = parsed ? normaliseDraft(parsed) : null;
  if (!draft) {
    return { ok: false, error: "The AI returned an unexpected response. Please try again." };
  }
  const { data: inserted, error } = await context.supabase
    .from("medical_video_projects")
    .insert({
      topic: data.topic,
      format: data.format,
      script: draft.script,
      scenes: draft.scenes,
      clip_jobs: [],
      narration_segments: [],
      subtitle_cues: [],
      status: "draft",
      created_by: context.userId,
    })
    .select("*")
    .single();
  if (error || !inserted) return { ok: false, error: "Could not save the medical video draft." };
  return hydrateProject(inserted as RawProjectRow, context);
}

export async function updateMedicalVideoDraft(
  data: { projectId: string; script: string; scenes: MedicalVideoScenePrompt[] },
  context: MarketingContext,
): Promise<MedicalVideoProject | { ok: false; error: string }> {
  if (!(await requireClinicAdmin(context)))
    return { ok: false, error: "This AI studio is restricted to clinic administrators." };
  const ok = await persistProject(
    data.projectId,
    {
      script: data.script,
      scenes: data.scenes,
      clip_jobs: [],
      narration_segments: [],
      subtitle_cues: [],
      final_video_path: null,
      error_message: null,
      approved: false,
      approved_at: null,
      approved_by: null,
      status: "draft",
    },
    context,
  );
  if (!ok) return { ok: false, error: "Could not save the medical video draft." };
  const row = await loadProject(data.projectId, context);
  if (!row) return { ok: false, error: "Could not load the medical video draft." };
  return hydrateProject(row, context);
}

export async function startMedicalVideoProjectGeneration(
  projectId: string,
  context: MarketingContext,
): Promise<MedicalVideoProject | { ok: false; error: string }> {
  if (!(await requireClinicAdmin(context)))
    return { ok: false, error: "This AI studio is restricted to clinic administrators." };
  const row = await loadProject(projectId, context);
  if (!row) return { ok: false, error: "Could not load the medical video project." };
  const scenes = toSceneArray(row.scenes);
  if (scenes.length < 4) {
    return {
      ok: false,
      error: "Please generate and review the script before starting the video jobs.",
    };
  }
  const clips: MedicalVideoClipJob[] = [];
  for (const scene of scenes) {
    const started = await startOpenAiVideoJob(sceneVideoInput(row.topic, row.format, scene));
    if (!started.ok) {
      await persistProject(
        projectId,
        {
          clip_jobs: clips,
          status: "failed",
          error_message: started.error,
        },
        context,
      );
      return { ok: false, error: started.error };
    }
    clips.push({
      sceneId: scene.id,
      title: scene.title,
      prompt: scene.visualPrompt,
      durationSeconds: scene.clipDurationSeconds === 12 ? 12 : 8,
      jobId: started.jobId,
      status: "queued",
      progress: 0,
    });
  }
  const saved = await persistProject(
    projectId,
    {
      clip_jobs: clips,
      narration_segments: [],
      subtitle_cues: [],
      final_video_path: null,
      error_message: null,
      approved: false,
      approved_at: null,
      approved_by: null,
      status: "generating_clips",
    },
    context,
  );
  if (!saved) return { ok: false, error: "Could not save the video jobs." };
  const refreshed = await loadProject(projectId, context);
  if (!refreshed) return { ok: false, error: "Could not load the medical video project." };
  return hydrateProject(refreshed, context);
}

export async function readMedicalVideoProject(
  projectId: string,
  context: MarketingContext,
): Promise<MedicalVideoProject | { ok: false; error: string }> {
  if (!(await requireClinicAdmin(context)))
    return { ok: false, error: "This AI studio is restricted to clinic administrators." };
  const row = await loadProject(projectId, context);
  if (!row) return { ok: false, error: "Could not check the video status." };

  if (row.status === "generating_clips") {
    const scenes = toSceneArray(row.scenes);
    const nextClips: MedicalVideoClipJob[] = [];
    for (const clip of toClipArray(row.clip_jobs)) {
      if (clip.storagePath) {
        nextClips.push({ ...clip, status: "completed", progress: 100 });
        continue;
      }
      const state = await getOpenAiVideoJobState(clip.jobId);
      if (!state.ok) {
        await persistProject(projectId, { status: "failed", error_message: state.error }, context);
        return { ok: false, error: state.error };
      }
      if (state.status !== "completed") {
        nextClips.push({ ...clip, status: state.status, progress: state.progress });
        continue;
      }
      const download = await downloadOpenAiVideoBytes(clip.jobId);
      if (!download.ok) {
        await persistProject(
          projectId,
          { status: "failed", error_message: download.error },
          context,
        );
        return { ok: false, error: download.error };
      }
      const storagePath = `${context.userId}/marketing/medical-video/${projectId}/clips/${clip.sceneId}.mp4`;
      const uploaded = await uploadPrivateMediaAsset(
        context,
        storagePath,
        download.bytes,
        "video/mp4",
      );
      if (!uploaded.ok) {
        await persistProject(
          projectId,
          { status: "failed", error_message: uploaded.error },
          context,
        );
        return { ok: false, error: uploaded.error };
      }
      nextClips.push({
        ...clip,
        status: "completed",
        progress: 100,
        storagePath: uploaded.storagePath,
      });
    }
    const allComplete =
      nextClips.length === scenes.length && nextClips.every((clip) => clip.storagePath);
    await persistProject(
      projectId,
      {
        clip_jobs: nextClips,
        status: allComplete ? "generating_narration" : "generating_clips",
        error_message: null,
      },
      context,
    );
    const refreshed = await loadProject(projectId, context);
    if (!refreshed) return { ok: false, error: "Could not check the video status." };
    return hydrateProject(refreshed, context);
  }

  if (row.status === "generating_narration") {
    const scenes = toSceneArray(row.scenes);
    const narrationSegments: MedicalNarrationSegment[] = [];
    for (const scene of scenes) {
      const audio = await createNarrationAudio(scene.narration);
      if (!audio.ok) {
        await persistProject(projectId, { status: "failed", error_message: audio.error }, context);
        return { ok: false, error: audio.error };
      }
      const storagePath = `${context.userId}/marketing/medical-video/${projectId}/narration/${scene.id}.wav`;
      const uploaded = await uploadPrivateMediaAsset(
        context,
        storagePath,
        audio.bytes,
        "audio/wav",
      );
      if (!uploaded.ok) {
        await persistProject(
          projectId,
          { status: "failed", error_message: uploaded.error },
          context,
        );
        return { ok: false, error: uploaded.error };
      }
      narrationSegments.push({
        sceneId: scene.id,
        text: scene.narration,
        storagePath: uploaded.storagePath,
        durationSeconds: audio.durationSeconds,
      });
    }
    const subtitleCues = buildSubtitleCues(scenes, narrationSegments);
    await persistProject(
      projectId,
      {
        narration_segments: narrationSegments,
        subtitle_cues: subtitleCues,
        status: "rendering",
        error_message: null,
      },
      context,
    );
    const refreshed = await loadProject(projectId, context);
    if (!refreshed) return { ok: false, error: "Could not check the video status." };
    return hydrateProject(refreshed, context);
  }

  if (row.status === "rendering") {
    const project = await hydrateProject(row, context);
    const rendered = await renderMedicalPromoVideo(project, context);
    if (!rendered.ok) {
      await persistProject(projectId, { status: "failed", error_message: rendered.error }, context);
      return { ok: false, error: rendered.error };
    }
    await persistProject(
      projectId,
      {
        final_video_path: rendered.storagePath,
        final_video_duration_seconds: TARGET_VIDEO_SECONDS,
        status: "ready",
        error_message: null,
      },
      context,
    );
    const refreshed = await loadProject(projectId, context);
    if (!refreshed) return { ok: false, error: "Could not check the video status." };
    return hydrateProject(refreshed, context);
  }

  return hydrateProject(row, context);
}

export async function approveMedicalVideoProjectReview(
  projectId: string,
  context: MarketingContext,
): Promise<MedicalVideoProject | { ok: false; error: string }> {
  if (!(await requireClinicAdmin(context)))
    return { ok: false, error: "This AI studio is restricted to clinic administrators." };
  const ok = await persistProject(
    projectId,
    {
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: context.userId,
    },
    context,
  );
  if (!ok) return { ok: false, error: "Could not save the approval state." };
  const row = await loadProject(projectId, context);
  if (!row) return { ok: false, error: "Could not load the medical video project." };
  return hydrateProject(row, context);
}
