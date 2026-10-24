/**
 * LINE OA broadcast — server side, admins only.
 *
 * Sends one message to every friend of the clinic's LINE Official Account
 * through the LINE Messaging API. The channel access token lives only in the
 * server secret LINE_CHANNEL_ACCESS_TOKEN, never in the browser.
 * Each send carries a retry key, so a double click never sends twice.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const API = "https://api.line.me/v2/bot";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

function token(): string {
  return process.env["LINE_CHANNEL_ACCESS_TOKEN"] ?? "";
}

async function lineGet(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

function yesterdayBangkok(): string {
  const d = new Date(Date.now() + 7 * 3600_000 - 86_400_000);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

export type LineStatus = {
  configured: boolean;
  quota: number | null;
  used: number | null;
  friends: number | null;
  error?: string;
};

/** Is LINE connected, how many messages are left this month, how many friends. */
export const getLineStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LineStatus> => {
    await assertAdmin(context);
    if (!token()) return { configured: false, quota: null, used: null, friends: null };
    const [quota, used, followers] = await Promise.all([
      lineGet("/message/quota"),
      lineGet("/message/quota/consumption"),
      lineGet(`/insight/followers?date=${yesterdayBangkok()}`),
    ]);
    if (!quota && !used) {
      return { configured: true, quota: null, used: null, friends: null, error: "LINE rejected the token. Check LINE_CHANNEL_ACCESS_TOKEN." };
    }
    return {
      configured: true,
      quota: quota?.["type"] === "limited" ? Number(quota["value"] ?? 0) : null,
      used: used ? Number(used["totalUsage"] ?? 0) : null,
      friends: followers?.["status"] === "ready" ? Number(followers["targetedReaches"] ?? followers["followers"] ?? 0) : null,
    };
  });

const sendSchema = z.object({
  text: z.string().trim().min(2).max(5000),
  imageUrl: z.string().trim().url().startsWith("https://").max(1000).optional().or(z.literal("")),
  retryKey: z.string().uuid(),
  confirm: z.literal(true),
});

/** Broadcast to all LINE friends. Needs an explicit confirm from the page. */
export const sendLineBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!token()) return { ok: false as const, error: "LINE is not connected yet (LINE_CHANNEL_ACCESS_TOKEN)." };
    const messages: Record<string, string>[] = [];
    if (data.imageUrl) {
      messages.push({ type: "image", originalContentUrl: data.imageUrl, previewImageUrl: data.imageUrl });
    }
    messages.push({ type: "text", text: data.text });
    const res = await fetch(`${API}/message/broadcast`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        "X-Line-Retry-Key": data.retryKey,
      },
      body: JSON.stringify({ messages }),
    });
    if (res.ok || res.status === 409) return { ok: true as const }; // 409 = this exact send already went out
    let message = `LINE error ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = `LINE: ${body.message}`;
    } catch {
      /* keep the status message */
    }
    return { ok: false as const, error: message };
  });
