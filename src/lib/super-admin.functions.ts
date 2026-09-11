import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSuperAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { hasSuperAdminAccess, safeSuperAdminStatus } = await import("@/lib/super-admin.server");
    const allowed = await hasSuperAdminAccess(context);
    return {
      allowed,
      ...(allowed ? safeSuperAdminStatus() : {}),
    };
  });
