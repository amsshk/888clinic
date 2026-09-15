import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("lead endpoint validates metadata and requires a server-only bearer secret", () => {
  const shared = readFileSync(
    new URL("./meta-lead.shared.ts", import.meta.url),
    "utf8",
  );

  const route = readFileSync(
    new URL("../routes/api/public/meta-leads.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    shared,
    /platform:\s*z\.enum\(\["facebook",\s*"instagram"\]\)/,
  );

  assert.match(
    shared,
    /clinicBranch:\s*z\.enum\(\["srinakarin",\s*"nakhon-pathom"\]\)/,
  );

  assert.match(shared, /"consultation"/);
  assert.match(shared, /"acne"/);
  assert.match(shared, /"pigmentation"/);
  assert.match(shared, /"mole-check"/);

  assert.match(
    shared,
    /crypto\.subtle\.digest\("SHA-256"/,
  );

  assert.match(route, /META_LEAD_INGEST_SECRET/);
  assert.match(route, /metaLeadSchema\.safeParse/);

  assert.match(
    route,
    /result\.duplicate\s*\?\s*200\s*:\s*201/,
  );
});

test("migration provides atomic lead-id idempotency", () => {
  const migration = readFileSync(
    new URL(
      "../../supabase/migrations/20260915000000_atomic_meta_lead_intake.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /lead_id text primary key/);
  assert.match(migration, /on conflict \(lead_id\) do nothing/);
  assert.match(migration, /insert into public\.enquiries/);

  assert.match(
    migration,
    /grant execute[\s\S]*to service_role/,
  );

  assert.doesNotMatch(
    migration,
    /grant execute[\s\S]*to anon/,
  );
});
