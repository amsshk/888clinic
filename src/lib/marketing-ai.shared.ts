import { z } from "zod";

export const adCopySchema = z.object({
  objective: z.string().trim().min(1).max(80),
  offer: z.string().trim().max(400).default(""),
  audience: z.string().trim().max(400).default(""),
  language: z.enum(["en", "th", "both"]).default("both"),
  tone: z.string().trim().max(80).default("warm luxury clinic"),
  placement: z.string().trim().max(80).default("Facebook & Instagram feed"),
  variants: z.number().int().min(1).max(5).default(3),
});

/**
 * A starting frame is optional, but when one is sent it must be a base64 data
 * URL we can hand straight to OpenAI — no remote URLs (SSRF) and no formats the
 * video model refuses. 6M characters of base64 is roughly 4.5 MB of image,
 * which is well inside the provider limit while keeping the request payload
 * sane.
 */
export const REFERENCE_IMAGE_MAX_CHARS = 6_000_000;

export const referenceImageSchema = z
  .string()
  .trim()
  .max(REFERENCE_IMAGE_MAX_CHARS, "That starting image is too large. Please use a smaller photo.")
  .regex(
    /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    "The starting image must be a JPEG, PNG or WebP photo.",
  );

export const videoPromptSchema = z.object({
  objective: z.string().trim().min(1).max(80),
  offer: z.string().trim().max(400).default(""),
  audience: z.string().trim().max(400).default(""),
  prompt: z.string().trim().min(10).max(1800),
  duration: z.enum(["4", "8", "12"]).default("8"),
  format: z.enum(["vertical", "square", "landscape"]).default("vertical"),
  referenceImage: referenceImageSchema.optional(),
});

export const videoJobSchema = z.object({
  jobId: z.string().trim().min(1).max(200),
});

export type AdVariant = {
  angle: string;
  primaryTextEn: string;
  headlineEn: string;
  descriptionEn: string;
  primaryTextTh: string;
  headlineTh: string;
  descriptionTh: string;
  cta: string;
  hashtags: string[];
  creativeIdea: string;
};

export type MarketingVideoStatus =
  | { ok: true; status: "queued" | "in_progress"; progress: number }
  | { ok: true; status: "completed"; videoUrl: string }
  | { ok: false; error: string };
