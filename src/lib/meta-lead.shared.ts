import { z } from "zod";

export const META_LEAD_BODY_LIMIT_BYTES = 32 * 1024;

export const metaLeadSchema = z.object({
  leadId: z.string().trim().min(1).max(160),
  formId: z.string().trim().min(1).max(160),
  platform: z.enum(["facebook", "instagram"]),
  createdTime: z.string().datetime({ offset: true }),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(255),
  clinicBranch: z.enum(["srinakarin", "nakhon-pathom"]),
  service: z
    .enum([
      "consultation",
      "acne",
      "pigmentation",
      "mole-check",
      "botox",
      "filler",
      "laser",
      "skincare",
    ])
    .optional()
    .default("consultation"),
  campaign: z.string().trim().max(160).optional().default(""),
});

export type MetaLead = z.infer<typeof metaLeadSchema>;

export function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

export async function tokensMatch(
  provided: string,
  expected: string,
): Promise<boolean> {
  if (!provided || !expected) return false;

  const encoder = new TextEncoder();

  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);

  if (left.length !== right.length) return false;

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}
