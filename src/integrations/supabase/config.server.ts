type ServerEnvironment = Record<string, string | undefined>;

function projectUrl(env: ServerEnvironment): string {
  const url = env["SUPABASE_URL"]?.trim() || env["VITE_SUPABASE_URL"]?.trim();
  if (!url) throw new Error("Set SUPABASE_URL in the server runtime environment.");
  return url;
}

export function getSupabasePublicConfig(env: ServerEnvironment = process.env) {
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

export function getSupabaseAdminConfig(env: ServerEnvironment = process.env) {
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
