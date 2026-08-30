/**
 * Builds the editable-zone mask for the before/after render — browser only.
 *
 * Why the browser: the mask has to match the uploaded photo pixel-for-pixel,
 * and the server runs in a Worker runtime with no canvas. The patient's browser
 * already holds the file, so it rasterises the mask and posts it alongside the
 * photo.
 *
 * OpenAI's edit convention: TRANSPARENT pixels are editable, OPAQUE pixels are
 * protected. So we start fully opaque (nothing may change) and punch feathered
 * holes over the zones the patient actually selected. Everything else — eyes,
 * nose, hair, clothing, background — is physically un-editable, which is what
 * stops the face drifting.
 */

import { maskShapesForZones, type MaskEllipse } from "@/lib/aesthetic-zones";

function drawShapes(
  ctx: CanvasRenderingContext2D,
  shapes: MaskEllipse[],
  width: number,
  height: number,
) {
  ctx.fillStyle = "#ffffff";
  for (const shape of shapes) {
    ctx.beginPath();
    ctx.ellipse(
      shape.cx * width,
      shape.cy * height,
      Math.max(shape.rx * width, 2),
      Math.max(shape.ry * height, 2),
      shape.rot ?? 0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/**
 * @returns a PNG data URL sized to the photo, or null when the browser cannot
 * rasterise it (in which case the render simply proceeds unmasked).
 */
export async function buildZoneMaskDataUrl(
  photo: Blob,
  zoneIds: string[],
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const shapes = maskShapesForZones(zoneIds);
  if (!shapes.length) return null;

  try {
    // The mask must match the photo pixel-for-pixel — OpenAI rejects a mismatch,
    // so never resize here.
    const bitmap = await createImageBitmap(photo);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close?.();

    // Layer 1: the editable shapes in white on transparent, then blurred so the
    // treated area blends into the untouched photo instead of showing a seam.
    const holes = document.createElement("canvas");
    holes.width = width;
    holes.height = height;
    const holesCtx = holes.getContext("2d");
    if (!holesCtx) return null;
    const feather = Math.max(4, Math.round(Math.min(width, height) * 0.012));
    holesCtx.filter = `blur(${feather}px)`;
    drawShapes(holesCtx, shapes, width, height);
    holesCtx.filter = "none";

    // Layer 2: fully protected, minus the blurred holes.
    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const ctx = mask.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(holes, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const dataUrl = mask.toDataURL("image/png");
    if (!dataUrl.startsWith("data:image/png")) return null;
    return { dataUrl, width, height };
  } catch (error) {
    console.warn("[aesthetic-mask] could not build mask", error);
    return null;
  }
}

/**
 * Final identity guard: composite the rendered result back over the ORIGINAL
 * photo through the same mask.
 *
 * The model is asked to leave everything outside the treated zones alone, and
 * the mask makes that the rule — but only this step makes it a guarantee:
 * every pixel outside the feathered editable region comes byte-for-byte from
 * the patient's own photo, so "unchanged" is arithmetic, not a promise.
 *
 * @returns a PNG data URL, or null when compositing is not possible (caller
 * then falls back to the raw render).
 */
export async function compositeThroughMask(
  originalPhoto: Blob,
  renderedDataUrl: string,
  maskDataUrl: string,
): Promise<string | null> {
  try {
    const [original, rendered, mask] = await Promise.all([
      createImageBitmap(originalPhoto),
      loadImage(renderedDataUrl),
      loadImage(maskDataUrl),
    ]);

    const width = original.width;
    const height = original.height;

    // The edited region only: the render, minus everything the mask protects.
    const edit = document.createElement("canvas");
    edit.width = width;
    edit.height = height;
    const editCtx = edit.getContext("2d");
    if (!editCtx) return null;
    // Rendered image may come back at a different resolution — scale to the photo.
    editCtx.drawImage(rendered, 0, 0, width, height);
    editCtx.globalCompositeOperation = "destination-out";
    editCtx.drawImage(mask, 0, 0, width, height);
    editCtx.globalCompositeOperation = "source-over";

    // The patient's photo underneath, with only that region painted over it.
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(original, 0, 0);
    ctx.drawImage(edit, 0, 0);

    original.close?.();
    const dataUrl = out.toDataURL("image/png");
    return dataUrl.startsWith("data:image/png") ? dataUrl : null;
  } catch (error) {
    console.warn("[aesthetic-mask] composite failed", error);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not decode image"));
    img.src = src;
  });
}
