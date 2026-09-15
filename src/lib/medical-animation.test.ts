import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("medical animation studio component contains precision scenes and layer controls", () => {
  const studioSource = readFileSync(
    new URL("../components/admin/MedicalAnimationStudio.tsx", import.meta.url),
    "utf8",
  );

  assert.match(studioSource, /Medical Animation Studio/i);
  assert.match(studioSource, /Upper Facial Neuromodulator Precision Map|botox-map/i);
  assert.match(studioSource, /Hyaluronic Volumization|filler-contours/i);
  assert.match(studioSource, /Dr MALI AI Multispectral Dermatology Sweep|mali-scan/i);
  assert.match(studioSource, /Render MP4 Video \(Disabled\)|Render.*disabled/i);
});

test("marketing tab does not expose medical animation studio and keeps active promo tools", () => {
  const marketingTabSource = readFileSync(
    new URL("../components/admin/MarketingTab.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(marketingTabSource, /MedicalAnimationStudio/);
  assert.doesNotMatch(marketingTabSource, /Medical Animation Studio/);
  assert.doesNotMatch(marketingTabSource, /<MedicalAnimationStudio\s*\/>/);
  assert.doesNotMatch(marketingTabSource, /"animation-studio"/);
  assert.match(marketingTabSource, /AI Campaign &amp; Video Studio/);
  assert.match(marketingTabSource, /Generate with OpenAI/);
  assert.match(marketingTabSource, /Ads Launch Planner/);
  assert.match(marketingTabSource, /EZ888N Connection/);
});
