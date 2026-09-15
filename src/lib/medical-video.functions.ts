import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  medicalVideoDraftSchema,
  medicalVideoProjectDraftUpdateSchema,
  medicalVideoProjectIdSchema,
} from "@/lib/medical-video.shared";
import type { MedicalVideoProject } from "@/lib/medical-video.shared";

export type { MedicalVideoProject } from "@/lib/medical-video.shared";

export const generateMedicalVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => medicalVideoDraftSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<MedicalVideoProject | { ok: false; error: string }> => {
      const { createMedicalVideoDraft } = await import("@/lib/medical-video.server");
      return createMedicalVideoDraft(data, context);
    },
  );

export const saveMedicalVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => medicalVideoProjectDraftUpdateSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<MedicalVideoProject | { ok: false; error: string }> => {
      const { updateMedicalVideoDraft } = await import("@/lib/medical-video.server");
      return updateMedicalVideoDraft(data, context);
    },
  );

export const startMedicalVideoProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => medicalVideoProjectIdSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<MedicalVideoProject | { ok: false; error: string }> => {
      const { startMedicalVideoProjectGeneration } = await import("@/lib/medical-video.server");
      return startMedicalVideoProjectGeneration(data.projectId, context);
    },
  );

export const getMedicalVideoProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => medicalVideoProjectIdSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<MedicalVideoProject | { ok: false; error: string }> => {
      const { readMedicalVideoProject } = await import("@/lib/medical-video.server");
      return readMedicalVideoProject(data.projectId, context);
    },
  );

export const approveMedicalVideoProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => medicalVideoProjectIdSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<MedicalVideoProject | { ok: false; error: string }> => {
      const { approveMedicalVideoProjectReview } = await import("@/lib/medical-video.server");
      return approveMedicalVideoProjectReview(data.projectId, context);
    },
  );
