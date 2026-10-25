type ServerEnvironment = Record<string, string | undefined>;

/**
 * The public Supabase URL and publishable key are also inlined at build time
 * (VITE_ build variables). On Cloudflare Workers, runtime secrets only reach
 * process.env when nodejs_compat_populate_process_env is on, so these copies
 * keep the login check working either way. Never used for the service-role key.
 */
const BUILT_IN: ServerEnvironment = {
  VITE_SUPABASE_URL: import.meta.env?.["VITE_SUPABASE_URL"],
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"],
};

function runtimeEnv(): ServerEnvironment {
  return { ...BUILT_IN, ...process.env };
}

function projectUrl(env: ServerEnvironment): string {
  const url = env["SUPABASE_URL"]?.trim() || env["VITE_SUPABASE_URL"]?.trim();
  if (!url) throw new Error("Set SUPABASE_URL in the server runtime environment.");
  return url;
}

export function getSupabasePublicConfig(env: ServerEnvironment = runtimeEnv()) {
  const url = projectUrl(env);
  const key =
    env["SUPABASE_PUBLISHABLE_KEY"]?.trim() || env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim();
  if (!key) {
    throw new Error(
      "Set SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in the server runtime environment.",
    );
  }
  return { url, key };
}

export function getSupabaseAdminConfig(env: ServerEnvironment = runtimeEnv()) {
  const url = projectUrl(env);
  const key = env["SUPABASE_SECRET_KEY"]?.trim() || env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!key) {
    throw new Error(
      "Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY as a server runtime secret for account administration.",
    );
  }
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "Account administration requires a Supabase secret or service-role key, not a publishable key.",
    );
  }
  return { url, key };
}
