/**
 * Always-on before & after fallback.
 *
 * The clinic's own MALI service produces the preferred render. When that service
 * is not connected (or is down), we still owe the patient a result — otherwise
 * the tool looks broken to anyone arriving from an advert. This path asks the
 * Lovable AI image model to edit the patient's photo using the SAME dosimetry
 * strengths our engine would apply, and labels the result as an AI simulation so
 * the UI never passes it off as a MALI render.
 */

import type { MaliPreview, MaliPreviewZone } from "@/lib/mali-aesthetic.server";
import { callGateway, parseImageContent, PREVIEW_IMAGE_MODEL } from "@/lib/ai-gateway.server";


export async function renderAiFallbackPreview(input: {
  apiKey: string;
  dataUrl: string;
  /** PNG data URL: transparent = editable zone, opaque = protected. */
  maskDataUrl?: string;
  zones: MaliPreviewZone[];
  goal: string;
  age: string;
  gender: string;
  notes: string;
}): Promise<{ ok: true; preview: MaliPreview } | { ok: false; error: string }> {

  const botox = input.zones.filter((z) => z.treatment === "botox");
  const filler = input.zones.filter((z) => z.treatment === "filler");

  const line = (z: MaliPreviewZone) => {
    const pct = Math.round(Math.max(0, Math.min(1, z.strength)) * 100);
    const head =
      z.treatment === "botox"
        ? `${z.label} — botulinum toxin ${z.dose} units, render ${pct}% of full muscle relaxation`
        : `${z.label} — hyaluronic acid filler ${z.dose} ml, render ${pct}% of a full volume correction`;
    return [head, z.anatomy ? `Do: ${z.anatomy}` : "", z.cannot ? `Do NOT: ${z.cannot}` : ""]
      .filter(Boolean)
      .join(" ");
  };

  const plan = input.zones.map(line).join(" | ");

  const masked = Boolean(input.maskDataUrl);

  const prompt = [
    "Task: produce the clinical 'AFTER' photograph of this exact patient 2-4 weeks after the injectable plan below, to the standard of a real clinic's before/after pair. This is a conservative visual simulation, not a guaranteed medical result.",
    masked
      ? "THE SUPPLIED MASK IS AUTHORITATIVE: you may only modify pixels inside the transparent (editable) regions of the mask. Everything else — identity, face shape, skin tone, hair, eyes, brows, nose, teeth, clothing, background, lighting, camera angle, expression, age, crop and image style — must be returned exactly as received."
      : "",
    "CLINICAL PHOTOGRAPH STANDARD: this must look like the SECOND frame of a genuine clinic before/after taken with the same camera in the same room minutes later — flat clinical lighting, plain background, no retouching, natural pores, natural shine, natural under-eye tone, visible skin texture and blemishes kept exactly as they are. It must NOT look like a portrait, an advert, a filter, or a beauty app.",
    "IDENTITY LOCK (highest priority): same person, same bone structure and face width, same skin tone and texture, same moles, freckles, scars and pores, same eyebrows, eyelids, eyelashes, iris colour, same nose, same teeth, same hair and hairline, same head angle and tilt, same expression, same clothing, same background, same camera distance, same crop, same resolution and aspect ratio. Do not re-render the face — edit only the pixels inside the treated areas and leave every other pixel unchanged.",
    botox.length
      ? "BOTULINUM TOXIN areas — muscle relaxation ONLY: soften dynamic lines subtly so the skin over that muscle looks smoother and calmer. Do not freeze the face and do not over-lift. Never add volume, never change contour, size or projection, never lift the brow position more than a millimetre, and keep deep etched-in creases faintly visible as fine static lines."
      : "",
    filler.length
      ? "FILLER areas — conservative support or volume ONLY inside the named anatomical zone: a small, believable increase in projection with physically correct highlight and shadow for the existing lighting. Typical volumes are 1 ml or less, so the change is subtle: a slightly better-supported contour, not a new face shape. Never smooth wrinkles outside the zone, never slim the face, never reshape lips or nose beyond the named zone."
      : "",
    "Preserve the patient's natural asymmetry unless a selected treatment specifically addresses it.",
    `PLAN (treat only these areas): ${plan}`,
    `Desired style: ${input.goal} — render the CONSERVATIVE end of the realistic range. Under-delivering is correct; over-delivering is a failure.`,
    input.age ? `Age: ${input.age} — keep the patient's apparent age identical.` : "",
    input.gender ? `Gender: ${input.gender}.` : "",
    input.notes ? `Patient notes: ${input.notes}.` : "",
    "FORBIDDEN: global skin smoothing, blurring or airbrushing, brightening or whitening skin, whitening teeth or eyes, removing moles/freckles/acne/scars, slimming or lifting the face or jaw unless a listed area says so, opening the eyes wider, changing makeup, changing age, changing hairstyle, adding glamour lighting or any filter, cropping or zooming, and any change outside the listed areas.",
    "Self-check before answering: place your result mentally beside the original — if a stranger could not tell it is the same photo of the same person on the same day, redo it with less change.",
    "Return only the edited photograph.",
  ]
    .filter(Boolean)
    .join("\n");


  const call = await callGateway(
    input.apiKey,
    {
      model: PREVIEW_IMAGE_MODEL,
      modalities: ["image", "text"],
      // OpenAI-only field: the zone mask. Stripped before the Lovable gateway call.
      ...(input.maskDataUrl ? { mask: input.maskDataUrl } : {}),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: input.dataUrl } },
          ],
        },
      ],
    },
    "aesthetic-fallback",
  );

  if (!call.ok) return { ok: false, error: `${call.error} No credit was used.` };

  const afterImage = parseImageContent(call.data);
  if (!afterImage) {
    console.error("[aesthetic-fallback] no image in response");
    return {
      ok: false,
      error:
        "We could not simulate that photo. Use a clear, front-facing, front-lit face photo — no credit was used.",
    };
  }

  // Provenance: openaiImageEdit tags the payload, so the admin panel can show
  // which provider actually rendered the preview and in which mode.
  const provider = typeof call.data["provider"] === "string" ? String(call.data["provider"]) : "";
  const model = typeof call.data["model"] === "string" ? String(call.data["model"]) : "";
  const mode = typeof call.data["mode"] === "string" ? String(call.data["mode"]) : "";

  if (provider === "openai") {
    return {
      ok: true,
      preview: {
        afterImage,
        engine: mode === "zone-masked-edit" ? "openai-zone-masked" : "openai-edit",
        engineVersion: `openai:${model}`,
        stages: [mode || "full-frame-edit"],
      },
    };
  }

  return {
    ok: true,
    preview: {
      afterImage,
      engine: "ai-simulation",
      engineVersion: PREVIEW_IMAGE_MODEL,
      stages: ["fallback", "ai simulation"],
    },
  };
}

