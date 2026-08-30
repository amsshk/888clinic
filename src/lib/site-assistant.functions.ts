/**
 * Clinic AI admin — server side.
 *
 * An admin types a plain-language request ("change the homepage headline",
 * "make the Thai booking button friendlier", "hide the retinol serum") and this
 * assistant carries it out through a small set of safe, reversible tools:
 * wording overrides (English + Thai) and skincare/scan-pack availability.
 *
 * It runs on the clinic's own OpenAI account (falling back to the Lovable
 * gateway only when OPENAI_API_KEY is missing), and it can never touch code,
 * patients, orders or payments — only the data-driven parts of the site.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssistantTurn = { role: "user" | "assistant"; content: string };
export type AssistantChange = { kind: "copy" | "availability" | "catalog"; detail: string };

export type AssistantResult =
  | { ok: true; reply: string; changes: AssistantChange[] }
  | { ok: false; error: string };

type ToolCall = { id?: string; function?: { name?: string; arguments?: string } };
type ChatMessage = Record<string, unknown>;

const MAX_STEPS = 6;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "find_copy",
      description:
        "Search the site's wording dictionary. Returns matching copy keys with the English source and the current live value in the chosen language.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words that appear in the text, or a key prefix like home. or book." },
          lang: { type: "string", enum: ["en", "th"] },
        },
        required: ["query", "lang"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_copy",
      description:
        "Replace the live wording for one copy key in one language. Use an empty value to reset it back to the shipped wording.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          lang: { type: "string", enum: ["en", "th"] },
          value: { type: "string" },
        },
        required: ["key", "lang", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_catalog",
      description:
        "List the scan packs and skincare products with their id, price in baht, Stripe price ids and availability.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "set_availability",
      description: "Show or hide one catalog item on the shop (does not change its price).",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, available: { type: "boolean" } },
        required: ["id", "available"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_catalog_item",
      description:
        "Create a new shop item or update an existing one (name, price, size, note, actives, category, order, availability). Prices are pushed to Stripe automatically. Call list_catalog first when editing so you use the real id.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Lowercase id, letters/numbers/dashes/underscores. Existing id = update.",
          },
          kind: { type: "string", enum: ["scan_pack", "skincare"] },
          name: { type: "string" },
          category: { type: "string" },
          size: { type: "string" },
          note: { type: "string" },
          actives: { type: "array", items: { type: "string" } },
          priceThb: { type: "number", description: "One-time price in baht." },
          refillThb: { type: "number", description: "Optional monthly refill price in baht." },
          credits: { type: "number", description: "Scans granted — scan packs only." },
          available: { type: "boolean" },
          sortOrder: { type: "number" },
        },
        required: ["id", "kind", "name", "priceThb"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_catalog_item",
      description:
        "Permanently remove a shop item. Prefer set_availability when the clinic may sell it again.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
] as const;

const SYSTEM = [
  "You are the AI admin for 888clinic, a dermatology and aesthetic clinic in Bangkok (branches: Srinakarin and Nakhon Pathom).",
  "You help the clinic owner change the live website by calling tools. Work in as few steps as possible.",
  "Wording: always find_copy first to get the exact key and current text, then set_copy. Never invent a key.",
  "Thai must read like a real Bangkok clinic wrote it — everyday words, ค่ะ / นะคะ when addressing the patient, never stiff textbook translation. Preserve any {placeholder} tokens exactly.",
  "Keep buttons and labels as short as the original; these are UI strings in fixed layouts.",
  "Shop: you can add products and scan packs, edit their name, price, size, notes and ingredients, reorder them, hide them, or delete them. Always call list_catalog before editing or deleting so you use the real id, and confirm a deletion request refers to the item you found.",
  "New skincare items: invent a clean lowercase id from the product name; prices you set are pushed to Stripe automatically, so state the new baht price back to the owner.",
  "You cannot change code, layout, patients, orders or payments. If asked, say so plainly and suggest asking the developer.",
  "Finish with a short plain-language summary of exactly what you changed.",
].join("\n");


async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const askSiteAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string; history?: AssistantTurn[] }) => ({
    message: String(input.message ?? "").slice(0, 2000),
    history: (Array.isArray(input.history) ? input.history : []).slice(-12).map((t) => ({
      role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(t.content ?? "").slice(0, 4000),
    })),
  }))
  .handler(async ({ data, context }): Promise<AssistantResult> => {
    await assertAdmin(context);
    if (!data.message.trim()) return { ok: false, error: "Tell me what you'd like to change." };

    const [{ callGateway, CHAT_MODEL }, { BASE_COPY }, { supabaseAdmin }] = await Promise.all([
      import("@/lib/ai-gateway.server"),
      import("@/lib/i18n"),
      import("@/integrations/supabase/client.server"),
    ]);

    const dict = BASE_COPY as Record<"en" | "th", Record<string, string>>;
    const changes: AssistantChange[] = [];

    async function liveValue(key: string, lang: "en" | "th") {
      const { data: row } = await supabaseAdmin
        .from("copy_overrides")
        .select("value")
        .eq("copy_key", key)
        .eq("lang", lang)
        .maybeSingle();
      return (row?.value as string | undefined) ?? dict[lang]?.[key] ?? "";
    }

    async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      if (name === "find_copy") {
        const lang = args["lang"] === "th" ? "th" : "en";
        const needle = String(args["query"] ?? "").toLowerCase().trim();
        const keys = Object.keys(dict.en).filter(
          (k) =>
            k.toLowerCase().includes(needle) ||
            (dict.en[k] ?? "").toLowerCase().includes(needle) ||
            (dict.th?.[k] ?? "").toLowerCase().includes(needle),
        );
        const hits = await Promise.all(
          keys.slice(0, 25).map(async (k) => ({
            key: k,
            english: dict.en[k],
            current: await liveValue(k, lang),
          })),
        );
        return { matches: hits, truncated: keys.length > 25, total: keys.length };
      }

      if (name === "set_copy") {
        const key = String(args["key"] ?? "");
        const lang = args["lang"] === "th" ? "th" : "en";
        const value = String(args["value"] ?? "").slice(0, 4000);
        if (!(key in dict.en)) return { ok: false, error: `Unknown copy key: ${key}` };

        if (!value.trim()) {
          const { error } = await supabaseAdmin
            .from("copy_overrides")
            .delete()
            .eq("copy_key", key)
            .eq("lang", lang);
          if (error) return { ok: false, error: error.message };
          changes.push({ kind: "copy", detail: `${key} (${lang}) reset to the shipped wording` });
          return { ok: true, reset: true };
        }

        const { error } = await supabaseAdmin.from("copy_overrides").upsert({
          copy_key: key,
          lang,
          value,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        });
        if (error) return { ok: false, error: error.message };
        changes.push({ kind: "copy", detail: `${key} (${lang}) → “${value.slice(0, 90)}”` });
        return { ok: true };
      }

      if (name === "list_catalog") {
        const { data: rows } = await supabaseAdmin
          .from("catalog_items")
          .select(
            "id, kind, name, category, size, note, actives, price_thb, refill_thb, credits, once_price_id, refill_price_id, available, sort_order",
          )
          .order("kind")
          .order("sort_order");
        return { items: rows ?? [] };
      }

      if (name === "set_availability") {
        const id = String(args["id"] ?? "");
        const available = args["available"] === true;
        const { data: row, error } = await supabaseAdmin
          .from("catalog_items")
          .update({ available })
          .eq("id", id)
          .select("name")
          .maybeSingle();
        if (error) return { ok: false, error: error.message };
        if (!row) return { ok: false, error: "No catalog item with that id" };
        changes.push({
          kind: "availability",
          detail: `${row.name} is now ${available ? "visible" : "hidden"} in the shop`,
        });
        return { ok: true };
      }

      if (name === "save_catalog_item") {
        const { catalogItemSchema } = await import("@/lib/catalog.shared");
        const parsed = catalogItemSchema.safeParse({
          id: String(args["id"] ?? "").toLowerCase().trim(),
          kind: args["kind"] === "scan_pack" ? "scan_pack" : "skincare",
          name: String(args["name"] ?? "").trim(),
          category: args["category"] == null ? null : String(args["category"]).slice(0, 40),
          size: args["size"] == null ? null : String(args["size"]).slice(0, 40),
          note: args["note"] == null ? null : String(args["note"]).slice(0, 400),
          actives: Array.isArray(args["actives"]) ? args["actives"].map((a) => String(a)) : [],
          priceThb: Math.round(Number(args["priceThb"] ?? 0)),
          refillThb: args["refillThb"] == null ? null : Math.round(Number(args["refillThb"])),
          credits: args["credits"] == null ? null : Math.round(Number(args["credits"])),
          available: args["available"] === false ? false : true,
          sortOrder: args["sortOrder"] == null ? 100 : Math.round(Number(args["sortOrder"])),
        });
        if (!parsed.success) {
          return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
        }
        const item = parsed.data;

        const { data: existing } = await supabaseAdmin
          .from("catalog_items")
          .select("once_price_id, refill_price_id, sort_order")
          .eq("id", item.id)
          .maybeSingle();

        const oncePriceId =
          (existing?.once_price_id as string | null) ??
          (item.kind === "scan_pack" ? `scan_pack_${item.id}_thb` : `${item.id}_once`);
        const refillPriceId =
          (existing?.refill_price_id as string | null) ??
          (item.kind === "skincare" && item.refillThb != null ? `${item.id}_refill` : null);

        const { error } = await supabaseAdmin.from("catalog_items").upsert(
          {
            id: item.id,
            kind: item.kind,
            name: item.name,
            category: item.category ?? null,
            size: item.size ?? null,
            note: item.note ?? null,
            actives: item.actives,
            price_thb: item.priceThb,
            refill_thb: item.refillThb ?? null,
            credits: item.kind === "scan_pack" ? (item.credits ?? 1) : null,
            once_price_id: oncePriceId,
            refill_price_id: refillPriceId,
            available: item.available,
            sort_order: existing ? (existing.sort_order as number) : item.sortOrder,
            updated_by: context.userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (error) return { ok: false, error: error.message };

        const { syncStripePrice } = await import("@/lib/catalog-stripe.server");
        const notes: string[] = [];
        for (const environment of ["sandbox", "live"] as const) {
          const once = await syncStripePrice(environment, oncePriceId, item.priceThb, item.name, false);
          if (once) notes.push(`${environment} ${once}`);
          if (refillPriceId && item.refillThb != null) {
            const refill = await syncStripePrice(
              environment,
              refillPriceId,
              item.refillThb,
              `${item.name} — monthly refill`,
              true,
            );
            if (refill) notes.push(`${environment} ${refill}`);
          }
        }

        changes.push({
          kind: "catalog",
          detail: `${existing ? "Updated" : "Added"} ${item.name} — ฿${item.priceThb}${
            item.available ? "" : " (hidden)"
          }`,
        });
        return { ok: true, created: !existing, stripeNotes: notes };
      }

      if (name === "delete_catalog_item") {
        const id = String(args["id"] ?? "");
        const { data: row, error } = await supabaseAdmin
          .from("catalog_items")
          .delete()
          .eq("id", id)
          .select("name")
          .maybeSingle();
        if (error) return { ok: false, error: error.message };
        if (!row) return { ok: false, error: "No catalog item with that id" };
        changes.push({ kind: "catalog", detail: `${row.name} was removed from the shop` });
        return { ok: true };
      }


      return { ok: false, error: `Unknown tool ${name}` };
    }

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM },
      ...data.history,
      { role: "user", content: data.message },
    ];

    const apiKey = process.env["LOVABLE_API_KEY"] ?? "";

    for (let step = 0; step < MAX_STEPS; step += 1) {
      const call = await callGateway(
        apiKey,
        { model: CHAT_MODEL, messages, tools: TOOLS, tool_choice: "auto" },
        "site-assistant",
      );
      if (!call.ok) return { ok: false, error: call.error };

      const choices = call.data["choices"] as Array<{ message?: ChatMessage }> | undefined;
      const message = choices?.[0]?.message;
      if (!message) return { ok: false, error: "The assistant returned nothing. Please try again." };

      const toolCalls = (message["tool_calls"] as ToolCall[] | undefined) ?? [];
      messages.push(message);

      if (!toolCalls.length) {
        const reply = String(message["content"] ?? "").trim();
        return { ok: true, reply: reply || "Done.", changes };
      }

      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        let result: unknown;
        try {
          result = await runTool(tc.function?.name ?? "", args);
        } catch (error) {
          result = { ok: false, error: error instanceof Error ? error.message : "Tool failed" };
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id ?? "",
          content: JSON.stringify(result).slice(0, 12_000),
        });
      }
    }

    return {
      ok: true,
      reply: "I made the changes I could, but ran out of steps before finishing. Ask me again to continue.",
      changes,
    };
  });
