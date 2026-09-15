import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("clinic admin helper delegates access checks to admin role assertions", () => {
  const adminSource = readFileSync(new URL("./super-admin.server.ts", import.meta.url), "utf8");
  assert.match(adminSource, /hasClinicAdminAccess/);
  assert.match(adminSource, /assertAdmin\(context\.supabase,\s*context\.userId\)/);
  assert.match(adminSource, /requireClinicAdmin/);
});

test("admin dashboard keeps the marketing tab and AI admin wording visible", () => {
  const adminRoute = readFileSync(new URL("../routes/admin.tsx", import.meta.url), "utf8");
  assert.match(adminRoute, /value="marketing"/i);
  assert.match(adminRoute, /AI admin/i);
  assert.match(adminRoute, /Clinic Admin/i);
  assert.match(adminRoute, /isAdmin/i);
});

test("marketing server operations require clinic admin authorization", () => {
  const marketingServer = readFileSync(
    new URL("./marketing-ai.server.ts", import.meta.url),
    "utf8",
  );
  assert.match(marketingServer, /requireClinicAdmin\(/i);
  assert.match(marketingServer, /clinic administrator|clinic admin/i);
  assert.match(marketingServer, /createAdCopy|startVideoGeneration|readVideoGeneration/i);

  const medicalVideoServer = readFileSync(
    new URL("./medical-video.server.ts", import.meta.url),
    "utf8",
  );
  assert.match(medicalVideoServer, /requireClinicAdmin\(/i);
  assert.match(
    medicalVideoServer,
    /createMedicalVideoDraft|startMedicalVideoProjectGeneration|readMedicalVideoProject/i,
  );
  assert.match(medicalVideoServer, /render-remotion\.mjs|audio\/speech|medical_video_projects/i);
});

test("marketing copy text keeps administrator-only wording", () => {
  const marketingTab = readFileSync(
    new URL("../components/admin/MarketingTab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(marketingTab, /administrator|admin/i);
  assert.match(marketingTab, /restricted to .*admin|clinic administrator|clinic admin/i);
  assert.match(marketingTab, /Medical Video Pipeline/i);
});
