import { z } from "zod";
import { SKINCARE_PRODUCTS, type SkincareProduct } from "@/lib/skincare-catalog";
import { CREDIT_PACKS, type CreditPack } from "@/lib/credit-packs";

export type CatalogKind = "scan_pack" | "skincare";

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  name: string;
  category: string | null;
  size: string | null;
  note: string | null;
  actives: string[];
  priceThb: number;
  refillThb: number | null;
  credits: number | null;
  oncePriceId: string | null;
  refillPriceId: string | null;
  available: boolean;
  sortOrder: number;
};

export type CatalogRow = {
  id: string;
  kind: string;
  name: string;
  category: string | null;
  size: string | null;
  note: string | null;
  actives: string[] | null;
  price_thb: number;
  refill_thb: number | null;
  credits: number | null;
  once_price_id: string | null;
  refill_price_id: string | null;
  available: boolean;
  sort_order: number;
};

export const CATALOG_COLUMNS =
  "id, kind, name, category, size, note, actives, price_thb, refill_thb, credits, once_price_id, refill_price_id, available, sort_order";

export function toCatalogItem(row: CatalogRow): CatalogItem {
  return {
    id: row.id,
    kind: row.kind === "scan_pack" ? "scan_pack" : "skincare",
    name: row.name,
    category: row.category,
    size: row.size,
    note: row.note,
    actives: row.actives ?? [],
    priceThb: row.price_thb,
    refillThb: row.refill_thb,
    credits: row.credits,
    oncePriceId: row.once_price_id,
    refillPriceId: row.refill_price_id,
    available: row.available,
    sortOrder: row.sort_order,
  };
}

/** Static defaults render instantly (and during SSR) until the live catalogue loads. */
export const FALLBACK_SKINCARE: CatalogItem[] = SKINCARE_PRODUCTS.map((p, i) => ({
  id: p.id,
  kind: "skincare",
  name: p.name,
  category: p.category,
  size: p.size,
  note: p.note,
  actives: p.actives,
  priceThb: p.priceThb,
  refillThb: p.refillThb,
  credits: null,
  oncePriceId: p.oncePriceId,
  refillPriceId: p.refillPriceId,
  available: true,
  sortOrder: 20 + i * 10,
}));

export const FALLBACK_PACKS: CatalogItem[] = CREDIT_PACKS.map((pack, i) => ({
  id: pack.id,
  kind: "scan_pack",
  name: `${pack.credits} AI skin scans`,
  category: null,
  size: null,
  note: null,
  actives: [],
  priceThb: pack.amountThb,
  refillThb: null,
  credits: pack.credits,
  oncePriceId: "scan_pack_3_thb",
  refillPriceId: null,
  available: true,
  sortOrder: 10 + i,
}));

/** Presentation shims so existing product/pack UI keeps working unchanged. */
export function asSkincareProduct(item: CatalogItem): SkincareProduct {
  return {
    id: item.id,
    name: item.name,
    category: (item.category ?? "Treat") as SkincareProduct["category"],
    size: item.size ?? "",
    priceThb: item.priceThb,
    refillThb: item.refillThb ?? item.priceThb,
    oncePriceId: item.oncePriceId ?? `${item.id}_once`,
    refillPriceId: item.refillPriceId ?? `${item.id}_refill`,
    note: item.note ?? "",
    actives: item.actives,
  };
}

export function asCreditPack(item: CatalogItem): CreditPack & { priceId: string; name: string; note: string | null } {
  return {
    id: item.id,
    credits: item.credits ?? 1,
    amountThb: item.priceThb,
    priceId: item.oncePriceId ?? "scan_pack_3_thb",
    name: item.name,
    note: item.note,
  };
}

export const catalogItemSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, dashes or underscores"),
  kind: z.enum(["scan_pack", "skincare"]),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(40).nullable().optional(),
  size: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().max(400).nullable().optional(),
  actives: z.array(z.string().trim().max(60)).max(8).default([]),
  priceThb: z.number().int().min(0).max(1000000),
  refillThb: z.number().int().min(0).max(1000000).nullable().optional(),
  credits: z.number().int().min(1).max(1000).nullable().optional(),
  oncePriceId: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_-]*$/)
    .nullable()
    .optional(),
  refillPriceId: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_-]*$/)
    .nullable()
    .optional(),
  available: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(100),
  syncStripe: z.boolean().default(true),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

/**
 * Closest thing a patient can actually buy when an item is sold out:
 * prefer the same category (or the same scan-pack idea), then the nearest price.
 */
export function findAlternative(
  item: CatalogItem,
  items: CatalogItem[],
): CatalogItem | null {
  const buyable = items.filter((c) => c.available && c.id !== item.id && c.kind === item.kind);
  if (buyable.length === 0) return null;
  const sameCategory = buyable.filter(
    (c) => (c.category ?? "") === (item.category ?? ""),
  );
  const pool = sameCategory.length > 0 ? sameCategory : buyable;
  return [...pool].sort(
    (a, b) => Math.abs(a.priceThb - item.priceThb) - Math.abs(b.priceThb - item.priceThb),
  )[0]!;
}
