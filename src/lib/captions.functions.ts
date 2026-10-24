/**
 * Caption studio — server side.
 *
 * Staff describe a post (treatment, offer, platform) and get three Thai captions
 * written for 888clinic, plus a policy check of any caption they paste in.
 * The check covers the two rule sets that get clinic posts rejected or reduced:
 * Meta's advertising policies and Thai rules for advertising medical services.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type CaptionOption = { text: string; hashtags: string[]; angle: string };
export type CaptionIssue = { phrase: string; rule: string; fix: string };

const RULES = [
  "Meta advertising rules: never address the reader's body, health or appearance problem directly",
  "(no 'คุณกำลังมีปัญหา…', 'ใครหน้าหย่อน…', 'แก้มห้อยของคุณ…'); no guaranteed or permanent results;",
  "no before/after comparisons in ads; no percentages or numbers about results; no 'best/no.1' superlatives;",
  "no shaming or fear. Thai medical-advertising rules for clinics: no promises of results, no claims of",
  "safety with 'no side effects', no free gifts or discounts framed as pressure ('วันนี้วันเดียว' urgency is",
  "risky), no doctor endorsements of products, always invite a consultation with the doctor.",
].join(" ");

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Staff only");
}

async function askJson(instruction: string, label: string) {
  const { callGateway, parseJsonContent, CHAT_MODEL } = await import("@/lib/ai-gateway.server");
  const call = await callGateway(
    "",
    {
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: instruction }],
    },
    label,
  );
  if (!call.ok) return { ok: false as const, error: call.error };
  const parsed = parseJsonContent(call.data);
  if (!parsed) return { ok: false as const, error: "The AI returned an unexpected answer. Try again." };
  return { ok: true as const, parsed };
}

const text = (value: unknown, max: number) => String(value ?? "").slice(0, max);

const generateSchema = z.object({
  topic: z.string().trim().min(2).max(300),
  offer: z.string().trim().max(300).optional().default(""),
  platform: z.enum(["facebook", "instagram", "line", "ad"]).default("facebook"),
  tone: z.enum(["warm", "premium", "friendly", "short"]).default("warm"),
});

/** Three Thai caption options for one post. */
export const generateCaptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const platform = {
      facebook: "a Facebook Page post (2-5 short lines, emoji allowed, end with how to book on Messenger)",
      instagram: "an Instagram post (hook in the first line, 3-6 short lines, hashtags at the end)",
      line: "a LINE OA message to existing friends (short, personal, one clear call to book)",
      ad: "the primary text of a Meta ad (first line must work alone, 2-4 lines, invite a chat)",
    }[data.platform];
    const tone = {
      warm: "warm and caring, like a trusted clinic nurse",
      premium: "calm quiet-luxury, confident, no hype",
      friendly: "friendly and casual Bangkok Thai",
      short: "very short and punchy",
    }[data.tone];
    const result = await askJson(
      [
        "You write social media captions in natural Thai for 888 Clinic (dermatology and aesthetics, Nakhon Pathom and Bangkok).",
        "Write like a real Thai clinic team, not a translation. Thai first; English words only where Thai clinics use them (Botox, Filler, HIFU).",
        `Write for ${platform}. Tone: ${tone}.`,
        `Topic / treatment: ${data.topic}.`,
        data.offer ? `Genuine offer to mention exactly as given: ${data.offer}.` : "No offer: do not invent prices or discounts.",
        `Follow these rules strictly: ${RULES}`,
        'Return JSON: {"options":[{"angle":"one-line idea in English","text":"the Thai caption","hashtags":["#…"]}]} with exactly 3 options, each a different angle.',
      ].join(" "),
      "captions-generate",
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    const rows = Array.isArray(result.parsed["options"]) ? (result.parsed["options"] as unknown[]) : [];
    if (!rows.length) return { ok: false as const, error: "No captions came back. Try again." };
    return {
      ok: true as const,
      options: rows.slice(0, 3).map((row) => {
        const v = row as Record<string, unknown>;
        return {
          angle: text(v["angle"], 120),
          text: text(v["text"], 1500),
          hashtags: Array.isArray(v["hashtags"])
            ? (v["hashtags"] as unknown[]).slice(0, 8).map((h) => text(h, 40))
            : [],
        } satisfies CaptionOption;
      }),
    };
  });

const checkSchema = z.object({ caption: z.string().trim().min(2).max(3000) });

/** Policy check of a caption staff wrote themselves, with a safe rewrite. */
export const checkCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const result = await askJson(
      [
        "You review Thai social media captions for a Thai aesthetic clinic before they are posted or used in Meta ads.",
        `Rules: ${RULES}`,
        "List every phrase that breaks a rule, quoting it exactly, with the rule in one short English sentence and a safe Thai replacement.",
        "Then give the whole caption rewritten so it keeps the meaning and style but breaks no rule.",
        'Return JSON: {"verdict":"ok|risky|reject","issues":[{"phrase":"…","rule":"…","fix":"…"}],"rewrite":"…"}.',
        `Caption:\n${data.caption}`,
      ].join(" "),
      "captions-check",
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    const verdict = String(result.parsed["verdict"] ?? "risky");
    const issues = Array.isArray(result.parsed["issues"]) ? (result.parsed["issues"] as unknown[]) : [];
    return {
      ok: true as const,
      verdict: (["ok", "risky", "reject"].includes(verdict) ? verdict : "risky") as "ok" | "risky" | "reject",
      issues: issues.slice(0, 12).map((row) => {
        const v = row as Record<string, unknown>;
        return { phrase: text(v["phrase"], 200), rule: text(v["rule"], 200), fix: text(v["fix"], 300) } satisfies CaptionIssue;
      }),
      rewrite: text(result.parsed["rewrite"], 3000),
    };
  });
