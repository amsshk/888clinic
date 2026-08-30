# Hard-composite the before/after render in the browser

Today the server marks `outsideMaskPreserved: true` as soon as a mask was sent — it trusts OpenAI to leave protected pixels alone. The browser does run a composite, but with canvas blend operations, not the per-pixel arithmetic the old `sharp` step did, and the "preserved" flag is set regardless of whether that composite succeeded.

## What changes

1. **New per-pixel composite utility** (`src/lib/aesthetic-composite.ts`, browser-only)
   - Signature: `compositeWithMask({ originalDataUrl, editedDataUrl, maskDataUrl })`.
   - Draws all three sources onto canvases sized to the **original** image's dimensions (edited and mask are scaled to fit).
   - Walks the pixel buffers: `editableAlpha = 255 - maskAlpha`, then blends `final = original + (edited - original) * (editableAlpha / 255)` per channel — so opaque mask areas are byte-identical to the patient photo, transparent areas are the edit, and feathered edges blend smoothly instead of showing a seam.
   - Returns a PNG data URL, or `null` if any decode/canvas step fails.

2. **Before/after flow** (`src/components/mali/BeforeAfterTool.tsx`)
   - When a mask exists, run the new utility on the raw OpenAI result plus the original photo.
   - Only the composited PNG is shown in the reveal slider and used for anything saved/downloaded. If compositing returns `null`, the raw render is shown and the preservation claim is dropped.

3. **Honest metadata**
   - Server (`src/lib/openai.server.ts`) stops asserting preservation: it reports the mode (`zone-masked-edit`) and leaves `outsideMaskPreserved: false`.
   - The client sets `outsideMaskPreserved: true` only after the canvas composite actually succeeds, and the engine detail shown under the result reflects that.

4. **Old helper** — `compositeThroughMask` in `src/lib/aesthetic-mask.ts` is replaced by the new utility (its callers move over), so there is one composite path, not two.

No native image dependency is added; `sharp` stays out.

## Verification

Run a real photo through `/mali` (or `/predict`) with a botox zone selection and confirm: the treated zone changes, background/hair/clothing pixels are visually identical to the upload, and the engine line reports the composite. Repeat with a filler zone, and check a run where the mask is absent still renders normally.
