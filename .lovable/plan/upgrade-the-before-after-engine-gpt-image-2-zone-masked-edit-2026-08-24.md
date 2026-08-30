# Upgrade the before/after engine: gpt-image-2 + zone-masked editing

Today the preview is a full-frame OpenAI `gpt-image-1` edit — which is why the face drifts or nothing visibly changes. The fix is the model upgrade plus a mask that makes "change nothing outside the treated zones" enforced rather than requested.

## What changes

1. **Default model** — `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2`, still overridable per deployment so you can set `gpt-image-1` if your account doesn't have access yet.
2. **Per-model request body** — the `/v1/images/edits` form is built from the selected model: `input_fidelity: high` only for `gpt-image-1` (gpt-image-2 rejects it), `mask` for both.
3. **Anatomical zone mask** — a PNG mask where the selected zones are transparent (editable) and everything else opaque (protected): forehead, glabella, brow lift, crow's feet, temples, masseter, tear trough, cheekbones, nasolabial folds, lips, chin, jawline. Edges are feathered so the treated area blends instead of showing a seam.
4. **Prompt tightened** — the clinical dosimetry wording stays, with the mask declared authoritative and the botox-vs-filler expectations stated separately (soften dynamic lines vs conservative volume inside the zone only), plus "preserve asymmetry unless treated".
5. **Fallback unchanged** — if OpenAI errors or no key is present, the existing Gemini render still answers so the tool never dead-ends.
6. **Engine metadata** — `/predict` and the admin engine panel report provider, model, mode (`zone-masked-edit` or `fallback`), whether fallback was used, and which primary failed.

## Verification

Three real-photo runs through `/predict`, plus the scan-test tab:

- **Botox** (forehead, glabella, crow's feet) — softening only in those lines, same eyes/nose/mouth/jaw/hair/background, no full-face beautification, admin shows `openai / gpt-image-2 / zone-masked-edit`.
- **Filler** (lips, chin, cheekbones) — conservative support in those zones only, no filter look.
- **Both** (glabella botox + lips/chin filler) — the two effects look different, only selected zones change, identity stable.
- **Scan test** — PDF still generates, no regression from the mask work.

## Technical notes

- `src/lib/openai.server.ts`: model-aware `/v1/images/edits` form with `supportsInputFidelity()` / `supportsMask()` helpers and an optional `mask` part; surface the OpenAI error text so the fallback decision is logged.
- Mask rasterisation: the server runs in a Worker runtime with no `node-canvas`, so the mask is drawn with the browser canvas in `/predict` (where the face-map zone geometry already lives) and posted alongside the photo as a PNG data URL; the server validates it and forwards the bytes. Zone shapes are the ellipse set you specified, normalised to the photo's dimensions, ready to be swapped for landmark-aware shapes once the face mesh emits them.
- `src/lib/aesthetic-zones.ts`: export the `TreatmentZone` union, the zone-shape table, and `getEditableZonesFromPlan()`.
- `src/lib/aesthetic-fallback.server.ts` / `ai-gateway.server.ts`: pass the mask through to the OpenAI edit path only; the Gemini body stays as-is.
- No timeouts added around the OpenAI call — a high-quality masked edit takes tens of seconds.
- Publish afterwards so 888clinic.co picks up the new engine.
