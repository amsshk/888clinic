import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { DISPOSABLE_EMAIL_DOMAINS } from "@/lib/disposable-domains";

/**
 * Signup friction: blocks throwaway inboxes and throttles repeat signups from the
 * same network, so one person can't spin up accounts to farm free scans.
 */
export const checkSignupAllowed = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => ({
    email: String(input.email ?? "").trim().toLowerCase().slice(0, 255),
  }))
  .handler(async ({ data }) => {
    const domain = data.email.split("@")[1] ?? "";
    if (!domain || !domain.includes(".")) {
      return { allowed: false as const, reason: "Please use a valid email address." };
    }
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return {
        allowed: false as const,
        reason: "Temporary email addresses aren't accepted. Please sign up with your real email.",
      };
    }

    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);

    if (ip !== "unknown" && (count ?? 0) >= 3) {
      return {
        allowed: false as const,
        reason:
          "Too many accounts have been created from this connection today. Please sign in to your existing account or contact the clinic.",
      };
    }

    await supabaseAdmin.from("signup_attempts").insert({ ip, email_domain: domain });

    return { allowed: true as const };
  });
