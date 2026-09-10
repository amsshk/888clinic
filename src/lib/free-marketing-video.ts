/**
 * Free, browser-only marketing video renderer.
 *
 * Everything here runs on the admin's own machine: a canvas is animated in real
 * time, captured with `HTMLCanvasElement.captureStream()` and encoded by
 * `MediaRecorder`. No network request is made, so it needs no OpenAI key, no
 * credit and no upload — the trade-off is that recording happens in real time
 * and the tab must stay open and visible while it runs.
 */

export type FreeVideoFormat = "vertical" | "square" | "landscape";
export type FreeVideoSeconds = 4 | 8 | 12;

export interface FreeMarketingVideoInput {
  /** Optional starting image as a data URL or base64 string. */
  image?: string;
  /** Campaign objective, rendered as the headline. */
  headline: string;
  /** Optional offer line, rendered under the headline. */
  offer?: string;
  format: FreeVideoFormat;
  seconds: FreeVideoSeconds;
}

export interface FreeMarketingVideoResult {
  blob: Blob;
  /** "mp4" when the browser can encode MP4, otherwise "webm". */
  extension: "mp4" | "webm";
  mimeType: string;
  width: number;
  height: number;
  seconds: number;
}

export const FREE_VIDEO_SIZES: Record<FreeVideoFormat, { width: number; height: number }> = {
  vertical: { width: 720, height: 1280 },
  square: { width: 1024, height: 1024 },
  landscape: { width: 1280, height: 720 },
};

export const FREE_VIDEO_FPS = 30;

const BRAND_LINE = "888CLINIC · BANGKOK";

/** Clinic palette: charcoal ground, white type, gold accent. */
const CHARCOAL = "#161514";
const CHARCOAL_DEEP = "#0b0a0a";
const WHITE = "#ffffff";
const GOLD = "#c9a55c";

const UNSUPPORTED_MESSAGE =
  "This browser cannot record video. Please use Chrome or Edge on a desktop computer to create a free motion video.";

/** MP4 first — Meta prefers it — then WebM fallbacks for Firefox and older Chrome. */
const CANDIDATE_TYPES: { mimeType: string; extension: "mp4" | "webm" }[] = [
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

function pickRecorderType(): { mimeType: string; extension: "mp4" | "webm" } {
  for (const candidate of CANDIDATE_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  // Some browsers accept an empty type and choose their own container.
  return { mimeType: "", extension: "webm" };
}

export function isFreeMarketingVideoSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

export function freeMarketingVideoUnsupportedMessage(): string {
  return UNSUPPORTED_MESSAGE;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The starting image could not be read."));
    image.src = source.startsWith("data:") ? source : `data:image/jpeg;base64,${source}`;
  });
}

/** Ease in and out so the zoom never snaps at the start or end. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    trimmed[maxLines - 1] = `${trimmed[maxLines - 1].replace(/[\s.,;:]+$/, "")}…`;
    return trimmed;
  }
  return lines;
}

interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/** Ken Burns: a slow zoom plus a gentle diagonal drift across the still. */
function drawBackground(
  frame: Frame,
  image: HTMLImageElement | null,
  progress: number,
  fade: number,
) {
  const { ctx, width, height } = frame;

  ctx.fillStyle = CHARCOAL;
  ctx.fillRect(0, 0, width, height);

  if (image) {
    const eased = easeInOut(progress);
    const zoom = 1.06 + eased * 0.14;
    const driftX = (eased - 0.5) * width * 0.06;
    const driftY = (eased - 0.5) * height * 0.05;

    const cover = Math.max(width / image.width, height / image.height) * zoom;
    const drawWidth = image.width * cover;
    const drawHeight = image.height * cover;
    ctx.drawImage(
      image,
      (width - drawWidth) / 2 + driftX,
      (height - drawHeight) / 2 + driftY,
      drawWidth,
      drawHeight,
    );
  } else {
    // No upload: a slowly breathing charcoal-and-gold clinic backdrop.
    const eased = easeInOut(progress);
    const glow = ctx.createRadialGradient(
      width * (0.35 + eased * 0.2),
      height * (0.3 + eased * 0.12),
      Math.min(width, height) * 0.05,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.85,
    );
    glow.addColorStop(0, "rgba(201,165,92,0.34)");
    glow.addColorStop(0.45, "rgba(60,54,46,0.6)");
    glow.addColorStop(1, CHARCOAL_DEEP);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // Dark readability gradient so white type always sits on a safe ground.
  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, "rgba(11,10,10,0.68)");
  scrim.addColorStop(0.38, "rgba(11,10,10,0.18)");
  scrim.addColorStop(0.72, "rgba(11,10,10,0.62)");
  scrim.addColorStop(1, "rgba(11,10,10,0.93)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  if (fade < 1) {
    ctx.fillStyle = `rgba(11,10,10,${1 - fade})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawOverlay(frame: Frame, input: FreeMarketingVideoInput, progress: number) {
  const { ctx, width, height } = frame;
  const unit = Math.min(width, height);
  const margin = Math.round(unit * 0.085);

  // Brand mark, top left, gold rule above it.
  const brandIn = clamp01(progress / 0.12);
  ctx.save();
  ctx.globalAlpha = easeInOut(brandIn);
  ctx.fillStyle = GOLD;
  ctx.fillRect(
    margin,
    margin,
    Math.round(unit * 0.16 * easeInOut(brandIn)),
    Math.max(2, unit * 0.006),
  );
  ctx.font = `600 ${Math.round(unit * 0.036)}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = WHITE;
  ctx.letterSpacing = `${Math.round(unit * 0.008)}px`;
  ctx.fillText(BRAND_LINE, margin, margin + Math.round(unit * 0.035));
  ctx.letterSpacing = "0px";
  ctx.restore();

  // Headline and offer, lower third, rising gently into place.
  const headlineSize = Math.round(unit * (input.format === "landscape" ? 0.075 : 0.082));
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${headlineSize}px Georgia, "Times New Roman", serif`;
  const maxWidth = width - margin * 2;
  const headlineLines = wrapText(ctx, input.headline || "888clinic Bangkok", maxWidth, 3);

  const offerSize = Math.round(unit * 0.042);
  const offerLines = input.offer?.trim()
    ? (() => {
        ctx.font = `400 ${offerSize}px "Helvetica Neue", Arial, sans-serif`;
        return wrapText(ctx, input.offer!.trim(), maxWidth, 2);
      })()
    : [];

  const headlineLeading = headlineSize * 1.16;
  const offerLeading = offerSize * 1.35;
  const blockHeight =
    headlineLines.length * headlineLeading +
    (offerLines.length ? offerLines.length * offerLeading + unit * 0.045 : 0);

  const textIn = easeInOut(clamp01((progress - 0.08) / 0.22));
  const rise = (1 - textIn) * unit * 0.05;
  let baseline = height - margin - blockHeight + headlineSize + rise;

  ctx.globalAlpha = textIn;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = unit * 0.03;
  ctx.fillStyle = WHITE;
  ctx.font = `700 ${headlineSize}px Georgia, "Times New Roman", serif`;
  for (const line of headlineLines) {
    ctx.fillText(line, margin, baseline);
    baseline += headlineLeading;
  }

  if (offerLines.length) {
    const offerIn = easeInOut(clamp01((progress - 0.2) / 0.22));
    ctx.globalAlpha = offerIn;
    baseline += unit * 0.02;
    ctx.fillStyle = GOLD;
    ctx.fillRect(
      margin,
      baseline - offerSize * 0.9,
      Math.round(unit * 0.09),
      Math.max(2, unit * 0.005),
    );
    baseline += unit * 0.025;
    ctx.fillStyle = WHITE;
    ctx.font = `400 ${offerSize}px "Helvetica Neue", Arial, sans-serif`;
    for (const line of offerLines) {
      ctx.fillText(line, margin, baseline);
      baseline += offerLeading;
    }
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // Gold progress rule along the bottom edge — a subtle sense of motion.
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, height - Math.max(3, unit * 0.008), width * progress, Math.max(3, unit * 0.008));
  ctx.restore();
}

/**
 * Render and record a short marketing video entirely in the browser.
 * Resolves with the recorded Blob and the file extension to download it with.
 */
export async function createFreeMarketingVideo(
  input: FreeMarketingVideoInput,
): Promise<FreeMarketingVideoResult> {
  if (!isFreeMarketingVideoSupported()) {
    throw new Error(UNSUPPORTED_MESSAGE);
  }

  const { width, height } = FREE_VIDEO_SIZES[input.format] ?? FREE_VIDEO_SIZES.vertical;
  const seconds = input.seconds;
  const totalMs = seconds * 1000;

  const image = input.image ? await loadImage(input.image) : null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("This browser could not create a drawing surface.");

  const frame: Frame = { ctx, width, height };
  drawBackground(frame, image, 0, 0);

  const stream = canvas.captureStream(FREE_VIDEO_FPS);
  const { mimeType, extension } = pickRecorderType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 },
  );

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    recorder.onerror = () =>
      reject(new Error("Recording failed. Please try again in Chrome or Edge."));
  });

  recorder.start(200);

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = clamp01(elapsed / totalMs);
      // Fade up at the start, fade down at the end.
      const fade = Math.min(clamp01(elapsed / 500), clamp01((totalMs - elapsed) / 500));
      drawBackground(frame, image, progress, fade);
      drawOverlay(frame, input, progress);
      if (elapsed >= totalMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  const blob = await finished;

  return { blob, extension, mimeType: blob.type || mimeType, width, height, seconds };
}
