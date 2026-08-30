import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, type Fail } from "@/lib/admin-users.shared";
import {
  CATALOG_COLUMNS,
  catalogItemSchema,
  toCatalogItem,
  type CatalogItem,
  type CatalogRow,
} from "@/lib/catalog.shared";
import type { StripeEnv } from "@/lib/stripe.server";

const saveCatalogSchema = catalogItemSchema.extend({
  environment: z.enum(["sandbox", "live"]).default("sandbox"),
});

export type CatalogAdminResult = { ok: true; items: CatalogItem[]; stripeNote?: string } | Fail;

import { syncStripePrice } from "@/lib/catalog-stripe.server";


async function loadAll(): Promise<CatalogItem[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("catalog_items")
    .select(CATALOG_COLUMNS)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true });
  return ((data as CatalogRow[] | null) ?? []).map(toCatalogItem);
}

export const listCatalogAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CatalogAdminResult> => {
    if (!(await assertAdmin(context.supabase, context.userId))) return { ok: false, error: "Admins only." };
    return { ok: true, items: await loadAll() };
  });

export const saveCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveCatalogSchema.parse(data))
  .handler(async ({ data, context }): Promise<CatalogAdminResult> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("catalog_items").upsert(
      {
        id: data.id,
        kind: data.kind,
        name: data.name,
        category: data.category ?? null,
        size: data.size ?? null,
        note: data.note ?? null,
        actives: data.actives,
        price_thb: data.priceThb,
        refill_thb: data.refillThb ?? null,
        credits: data.kind === "scan_pack" ? (data.credits ?? 1) : null,
        once_price_id: data.oncePriceId || null,
        refill_price_id: data.refillPriceId || null,
        available: data.available,
        sort_order: data.sortOrder,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) return { ok: false, error: "Could not save this item." };

    const notes: string[] = [];
    if (data.syncStripe) {
      const environment: StripeEnv = data.environment;
      if (data.oncePriceId) {
        const note = await syncStripePrice(environment, data.oncePriceId, data.priceThb, data.name, false);
        if (note) notes.push(note);
      }
      if (data.refillPriceId && data.refillThb != null) {
        const note = await syncStripePrice(
          environment,
          data.refillPriceId,
          data.refillThb,
          `${data.name} — monthly refill`,
          true,
        );
        if (note) notes.push(note);
      }
    }

    const result: CatalogAdminResult = { ok: true, items: await loadAll() };
    if (notes.length > 0) return { ...result, stripeNote: notes.join(" · ") };
    return result;
  });

export const setCatalogAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; available: boolean }) => ({
    id: String(data.id).slice(0, 60),
    available: Boolean(data.available),
  }))
  .handler(async ({ data, context }): Promise<CatalogAdminResult> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("catalog_items")
      .update({ available: data.available, updated_by: userId })
      .eq("id", data.id);
    if (error) return { ok: false, error: "Could not update availability." };
    return { ok: true, items: await loadAll() };
  });

export const deleteCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id).slice(0, 60) }))
  .handler(async ({ data, context }): Promise<CatalogAdminResult> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) return { ok: false, error: "Admins only." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("catalog_items").delete().eq("id", data.id);
    if (error) return { ok: false, error: "Could not remove this item." };
    return { ok: true, items: await loadAll() };
  });
