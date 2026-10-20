import { afterEach, describe, expect, test } from "bun:test";
import { getSupabaseAdminConfig, getSupabasePublicConfig } from "./config.server";
import { createSupabaseAdminClient } from "./client.server";

const url = "https://supabase-test.invalid";
const secretKey = "sb_secret_test_only";
const publicKey = "sb_publishable_test_only";
const savedFetch = globalThis.fetch;
const envNames = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const savedEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

afterEach(() => {
  globalThis.fetch = savedFetch;
  for (const name of envNames) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
});

describe("Supabase server configuration", () => {
  test("accepts the runtime variable names shown in Cloudflare", () => {
    const env = {
      SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: publicKey,
      SUPABASE_SECRET_KEY: secretKey,
    };
    expect(getSupabasePublicConfig(env)).toEqual({ url, key: publicKey });
    expect(getSupabaseAdminConfig(env)).toEqual({ url, key: secretKey });
  });

  test("keeps legacy runtime names and trims empty aliases", () => {
    expect(
      getSupabasePublicConfig({
        VITE_SUPABASE_URL: url,
        SUPABASE_PUBLISHABLE_KEY: " ",
        VITE_SUPABASE_PUBLISHABLE_KEY: publicKey,
      }),
    ).toEqual({ url, key: publicKey });
    expect(
      getSupabaseAdminConfig({
        SUPABASE_URL: url,
        SUPABASE_SECRET_KEY: " ",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-test-only",
      }),
    ).toEqual({ url, key: "legacy-service-role-test-only" });
  });

  test("prefers explicit public and new secret runtime keys", () => {
    expect(
      getSupabasePublicConfig({
        SUPABASE_URL: url,
        SUPABASE_PUBLISHABLE_KEY: publicKey,
        VITE_SUPABASE_PUBLISHABLE_KEY: "old-public-key",
      }).key,
    ).toBe(publicKey);
    expect(
      getSupabaseAdminConfig({
        SUPABASE_URL: url,
        SUPABASE_SECRET_KEY: secretKey,
        SUPABASE_SERVICE_ROLE_KEY: "old-admin-key",
      }).key,
    ).toBe(secretKey);
  });

  test("requires project and server credentials without exposing values", () => {
    expect(() => getSupabasePublicConfig({})).toThrow("SUPABASE_URL");
    expect(() => getSupabasePublicConfig({ SUPABASE_URL: url })).toThrow(
      "SUPABASE_PUBLISHABLE_KEY",
    );
    expect(() =>
      getSupabaseAdminConfig({
        SUPABASE_URL: url,
        VITE_SUPABASE_PUBLISHABLE_KEY: publicKey,
      }),
    ).toThrow("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
    expect(() =>
      getSupabaseAdminConfig({
        SUPABASE_URL: url,
        SUPABASE_SECRET_KEY: publicKey,
      }),
    ).toThrow("not a publishable key");
  });
});

describe("Supabase admin HTTP requests", () => {
  for (const legacy of [false, true]) {
    test(`lists accounts with ${legacy ? "legacy service-role" : "new secret"} credentials`, async () => {
      const key = legacy ? "legacy-service-role-test-only" : secretKey;
      process.env["SUPABASE_URL"] = url;
      delete process.env["SUPABASE_SECRET_KEY"];
      delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
      process.env[legacy ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_SECRET_KEY"] = key;
      const requests: Request[] = [];
      globalThis.fetch = (async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({ users: [{ id: "test-user", email: "staff@example.invalid" }] });
      }) as typeof fetch;

      const { data, error } = await createSupabaseAdminClient().auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      expect(error).toBeNull();
      expect(data.users[0]?.email).toBe("staff@example.invalid");
      expect(requests).toHaveLength(1);
      expect(new URL(requests[0]!.url).pathname).toBe("/auth/v1/admin/users");
      expect(requests[0]!.headers.get("apikey")).toBe(key);
      expect(requests[0]!.headers.get("authorization")).toBe(legacy ? `Bearer ${key}` : null);
    });
  }
});
