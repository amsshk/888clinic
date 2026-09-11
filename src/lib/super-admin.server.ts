import { assertAdmin } from "@/lib/admin-users.shared";

type SuperAdminContext = {
  supabase: unknown;
  userId: string;
  claims?: Record<string, unknown>;
};

function configuredValues(name: "SUPER_ADMIN_EMAILS" | "SUPER_ADMIN_USER_IDS"): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isConfiguredSuperAdmin(userId: string, email?: string | null): boolean {
  const allowedEmails = configuredValues("SUPER_ADMIN_EMAILS");
  const allowedUserIds = configuredValues("SUPER_ADMIN_USER_IDS");
  if (allowedEmails.length === 0 && allowedUserIds.length === 0) return false;

  return (
    allowedUserIds.includes(userId.toLowerCase()) ||
    (email ? allowedEmails.includes(email.trim().toLowerCase()) : false)
  );
}

export async function hasSuperAdminAccess(context: SuperAdminContext): Promise<boolean> {
  if (!(await assertAdmin(context.supabase, context.userId))) return false;
  const email = typeof context.claims?.["email"] === "string" ? context.claims["email"] : null;
  return isConfiguredSuperAdmin(context.userId, email);
}

export async function requireSuperAdmin(context: SuperAdminContext): Promise<boolean> {
  return hasSuperAdminAccess(context);
}

export function safeSuperAdminStatus() {
  return {
    pixelId: process.env["META_PIXEL_ID"] ?? "",
    graphApiVersion: "v22.0",
    pixelEnabled: process.env["VITE_META_PIXEL_ENABLED"] === "true",
    conversionsApiEnabled: process.env["META_CONVERSIONS_API_ENABLED"] === "true",
    conversionsApiToken: process.env["META_CONVERSIONS_API_TOKEN"] ? "Stored securely" : "Missing",
    testEventCode: process.env["META_TEST_EVENT_CODE"] ? "Stored securely" : "Missing",
  } as const;
}
