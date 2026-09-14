import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { requireClinicAdmin } from "@/lib/super-admin.server";

test("clinic admins are allowed while non-admins are rejected", async () => {
  const allow = await requireClinicAdmin({
    supabase: { rpc: async () => ({ data: true }) },
    userId: "user-123",
  });
  assert.equal(allow, true);

  const deny = await requireClinicAdmin({
    supabase: { rpc: async () => ({ data: false }) },
    userId: "user-456",
  });
  assert.equal(deny, false);
});

test("admin dashboard keeps the marketing tab and AI admin wording visible", () => {
  const adminRoute = readFileSync(new URL("../routes/admin.tsx", import.meta.url), "utf8");
  assert.match(adminRoute, /value="marketing"/i);
  assert.match(adminRoute, /AI admin/i);
  assert.match(adminRoute, /Clinic Admin/i);
  assert.match(adminRoute, /isAdmin/i);
});

test("marketing server operations require clinic admin authorization", () => {
  const marketingServer = readFileSync(new URL("./marketing-ai.server.ts", import.meta.url), "utf8");
  assert.match(marketingServer, /requireClinicAdmin\(/i);
  assert.match(marketingServer, /clinic administrator|clinic admin/i);
  assert.match(marketingServer, /createAdCopy|startVideoGeneration|readVideoGeneration/i);
});

test("marketing copy text keeps administrator-only wording", () => {
  const marketingTab = readFileSync(new URL("../components/admin/MarketingTab.tsx", import.meta.url), "utf8");
  assert.match(marketingTab, /administrator|admin/i);
  assert.match(marketingTab, /restricted to .*admin|clinic administrator|clinic admin/i);
});
