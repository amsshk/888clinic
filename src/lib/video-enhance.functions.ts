/**
 * Video enhancer tickets — server side, staff only.
 *
 * The heavy video work runs on the clinic's video server (ffmpeg cannot run on
 * Cloudflare Workers, and uploads there are capped). The browser uploads straight
 * to that server with a short-lived ticket signed here with VIDEO_SHARED_SECRET,
 * so only staff signed in on 888clinic.co can use it.
 *
 * Ticket format (verified by the server): v1.<expiry unix seconds>.<user id>.<hex HMAC-SHA256>
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TICKET_SECONDS = 2 * 60 * 60;

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type VideoTicket =
  | { ok: true; base: string; token: string; expiresAt: number }
  | { ok: false; error: string };

export const getVideoTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VideoTicket> => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) return { ok: false, error: "Staff only" };
    const secret = process.env["VIDEO_SHARED_SECRET"] ?? "";
    const base = (process.env["VIDEO_ENGINE_URL"] ?? "https://pro.888clinic.co").replace(/\/$/, "");
    if (!secret) return { ok: false, error: "The video enhancer is not connected yet (VIDEO_SHARED_SECRET)." };
    const exp = Math.floor(Date.now() / 1000) + TICKET_SECONDS;
    const message = `v1.${exp}.${context.userId}`;
    return { ok: true, base, token: `${message}.${await hmacHex(secret, message)}`, expiresAt: exp };
  });
