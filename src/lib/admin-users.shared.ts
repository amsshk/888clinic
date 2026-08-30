import { z } from "zod";

export type TeamMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  roles: string[];
  credits: number;
  free_scans_remaining: number;
};

export const roleSchema = z.enum(["admin", "staff"]);

export const createSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().max(120).optional().default(""),
  role: z.enum(["admin", "staff", "patient"]),
  credits: z.number().int().min(0).max(10000).optional().default(0),
});

export const roleChangeSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
  grant: z.boolean(),
});

export const creditsSchema = z.object({
  userId: z.string().uuid(),
  credits: z.number().int().min(0).max(100000),
  freeScans: z.number().int().min(0).max(1000),
});

export type Fail = { ok: false; error: string };

export async function assertAdmin(supabase: unknown, userId: string) {
  const client = supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}
