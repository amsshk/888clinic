/**
 * Before & after render from 888clinic's own MALI service.
 *
 * The render is produced by `ml/mali/serve` on a host the clinic controls:
 * MediaPipe FaceMesh landmarks + the app's dose rules decide the shape change,
 * then an optional SDXL inpainting + ControlNet pass repaints only the treated
 * zones so it reads as a photograph. There is deliberately NO image fallback to
 * a general-purpose image model: if this service is unreachable the simulator
 * reports itself offline and the patient's credit is refunded, so every rendered
 * result comes from the clinic's engine.
 */


export type MaliPreviewZone = {
  id: string;
  label: string;
  treatment: "botox" | "filler";
  dose: number;
  /** 0..1 share of the maximum realistic effect, from the app's dosimetry. */
  strength: number;
  /** what this product physically does in this area, for the refinement pass */
  anatomy?: string;
  /** what it cannot do, so the render never over-promises */
  cannot?: string;
};


export type MaliPreview = {
  afterImage: string;
  engine: string;
  engineVersion: string;
  stages: string[];
};

export type MaliHealth = {
  ok: boolean;
  configured: boolean;
  stub?: boolean;
  modelVersion?: string | null;
  lesion?: boolean;
  aestheticStages?: string[];
  refiner?: string | null;
  error?: string;
};

function baseUrl() {
  const url = process.env["MALI_API_URL"];
  return url ? url.replace(/\/+$/, "") : null;
}

export function maliConfigured() {
  return Boolean(process.env["MALI_API_URL"] && process.env["MALI_API_KEY"]);
}

export async function getMaliHealth(): Promise<MaliHealth> {
  const url = baseUrl();
  const apiKey = process.env["MALI_API_KEY"];
  if (!url || !apiKey) {
    return { ok: false, configured: false, error: "MALI_API_URL / MALI_API_KEY are not set." };
  }
  try {
    const response = await fetch(`${url}/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      return { ok: false, configured: true, error: `Service replied ${response.status}` };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      ok: true,
      configured: true,
      stub: Boolean(payload["stub"]),
      modelVersion: payload["model_version"] ? String(payload["model_version"]).slice(0, 80) : null,
      lesion: Boolean(payload["lesion"]),
      aestheticStages: Array.isArray(payload["aesthetic_stages"])
        ? (payload["aesthetic_stages"] as unknown[]).map((s) => String(s).slice(0, 20))
        : [],
      refiner: payload["refiner"] ? String(payload["refiner"]).slice(0, 40) : null,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Service unreachable",
    };
  }
}

export type MaliPreviewResult =
  | { ok: true; preview: MaliPreview }
  | { ok: false; error: string; offline: boolean };

export async function renderAestheticPreview(input: {
  dataUrl: string;
  zones: MaliPreviewZone[];
  goal: string;
  age: string;
  gender: string;
  notes: string;
}): Promise<MaliPreviewResult> {
  const url = baseUrl();
  const apiKey = process.env["MALI_API_KEY"];
  if (!url || !apiKey) {
    return {
      ok: false,
      offline: true,
      error: "The simulator is offline right now. Please try again shortly — no credit was used.",
    };
  }

  let response: Response;
  try {
    // No artificial timeout: a GPU refinement pass can legitimately run for a
    // minute or more, and the waiting UI already covers that.
    response = await fetch(`${url}/v1/aesthetic-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        image: input.dataUrl,
        zones: input.zones.map((z) => ({
          id: z.id,
          label: z.label,
          treatment: z.treatment,
          dose: z.dose,
          strength: Math.max(0, Math.min(1, z.strength)),
        })),
        goal: input.goal,
        age: input.age,
        gender: input.gender,
        notes: input.notes,
      }),
    });
  } catch (error) {
    console.error("[mali-aesthetic] unreachable", error);
    return {
      ok: false,
      offline: true,
      error: "The simulator is offline right now. Please try again shortly — no credit was used.",
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[mali-aesthetic] error", response.status, body.slice(0, 400));
    if (response.status === 422 || response.status === 400) {
      return {
        ok: false,
        offline: false,
        error:
          "MALI could not read that photo. Use a clear, front-facing, well-lit face photo without a filter.",
      };
    }
    return {
      ok: false,
      offline: true,
      error: "The simulation failed on our engine. Please try again — no credit was used.",
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const afterImage = typeof payload?.["after_image"] === "string" ? String(payload["after_image"]) : "";
  if (!afterImage.startsWith("data:image/")) {
    console.error("[mali-aesthetic] invalid payload");
    return {
      ok: false,
      offline: true,
      error: "The simulation failed on our engine. Please try again — no credit was used.",
    };
  }

  return {
    ok: true,
    preview: {
      afterImage,
      engine: String(payload?.["engine"] ?? "mali").slice(0, 60),
      engineVersion: String(payload?.["engine_version"] ?? "unknown").slice(0, 120),
      stages: Array.isArray(payload?.["stages"])
        ? (payload["stages"] as unknown[]).map((s) => String(s).slice(0, 20))
        : [],
    },
  };
}
