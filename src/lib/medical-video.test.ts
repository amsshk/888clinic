import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("medical video shared types capture scenes, clips, subtitles and project status", () => {
  const shared = readFileSync(new URL("./medical-video.shared.ts", import.meta.url), "utf8");
  assert.match(shared, /generating_narration|rendering|ready/);
  assert.match(shared, /MedicalVideoScenePrompt/);
  assert.match(shared, /MedicalVideoClipJob/);
  assert.match(shared, /MedicalNarrationSegment/);
  assert.match(shared, /MedicalSubtitleCue/);
  assert.match(shared, /medicalVideoProjectDraftUpdateSchema/);
});

test("medical video pipeline component exposes private review and approval actions", () => {
  const component = readFileSync(
    new URL("../components/admin/MedicalVideoPipeline.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /Topic → script → scenes → clips → narration → MP4/);
  assert.match(component, /Download MP4/);
  assert.match(component, /Approve video/);
  assert.match(component, /Private review/);
});

test("remotion pipeline registers the medical promo composition and server render props", () => {
  const root = readFileSync(new URL("../../remotion/src/Root.tsx", import.meta.url), "utf8");
  const renderScript = readFileSync(
    new URL("../../remotion/scripts/render-remotion.mjs", import.meta.url),
    "utf8",
  );
  assert.match(root, /medical-promo-vertical/);
  assert.match(root, /MedicalPromoVideo/);
  assert.match(renderScript, /inputProps/);
  assert.match(renderScript, /muted:\s*false/);
});
