import { z } from "zod";

export const MEDICAL_VIDEO_PROJECT_STATUSES = [
  "draft",
  "generating_clips",
  "generating_narration",
  "rendering",
  "ready",
  "failed",
] as const;

export const medicalVideoProjectStatusSchema = z.enum(MEDICAL_VIDEO_PROJECT_STATUSES);

export const medicalVideoSceneSchema = z.object({
  id: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  anatomyFocus: z.array(z.string().trim().min(1).max(120)).min(1).max(6),
  visualPrompt: z.string().trim().min(20).max(1600),
  narration: z.string().trim().min(10).max(500),
  clipDurationSeconds: z.number().int().min(8).max(12),
});

export const medicalVideoDraftSchema = z.object({
  topic: z.string().trim().min(3).max(120),
  format: z.enum(["vertical", "square", "landscape"]).default("vertical"),
});

export const medicalVideoProjectIdSchema = z.object({
  projectId: z.string().trim().uuid(),
});

export const medicalVideoProjectDraftUpdateSchema = z.object({
  projectId: z.string().trim().uuid(),
  script: z.string().trim().min(30).max(2400),
  scenes: z.array(medicalVideoSceneSchema).min(4).max(6),
});

export type MedicalVideoProjectStatus = z.infer<typeof medicalVideoProjectStatusSchema>;

export type MedicalVideoScenePrompt = z.infer<typeof medicalVideoSceneSchema>;

export type MedicalVideoClipJob = {
  sceneId: string;
  title: string;
  prompt: string;
  durationSeconds: 8 | 12;
  jobId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  storagePath?: string | undefined;
  videoUrl?: string | undefined;
  error?: string | undefined;
};

export type MedicalNarrationSegment = {
  sceneId: string;
  text: string;
  storagePath: string;
  audioUrl?: string | undefined;
  durationSeconds: number;
};

export type MedicalSubtitleCue = {
  id: string;
  sceneId: string;
  text: string;
  startSeconds: number;
  endSeconds: number;
};

export type MedicalVideoProject = {
  id: string;
  topic: string;
  format: "vertical" | "square" | "landscape";
  status: MedicalVideoProjectStatus;
  script: string;
  scenes: MedicalVideoScenePrompt[];
  clips: MedicalVideoClipJob[];
  narrationSegments: MedicalNarrationSegment[];
  subtitleCues: MedicalSubtitleCue[];
  finalVideoUrl?: string | undefined;
  approved: boolean;
  approvedAt: string | null;
  error: string | null;
};
