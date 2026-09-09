export type SkincareCategory = "Cleanse" | "Treat" | "Hydrate" | "Protect";

export type SkincareProduct = {
  id: string;
  name: string;
  category: SkincareCategory;
  size: string;
  priceThb: number;
  refillThb: number;
  oncePriceId: string;
  refillPriceId: string;
  note: string;
  actives: string[];
};

// Small, purpose-picked aftercare lineup for the three procedures patients ask about most.
export const SKINCARE_PRODUCTS: SkincareProduct[] = [
  {
    id: "arnica_recovery_gel",
    name: "Arnica Recovery Gel",
    category: "Treat",
    size: "30 ml",
    priceThb: 1490,
    refillThb: 1340,
    oncePriceId: "arnica_recovery_gel_once",
    refillPriceId: "arnica_recovery_gel_refill",
    note: "Reduces bruising and swelling after botox and filler injections.",
    actives: ["Arnica montana", "Bromelain"],
  },
  {
    id: "post_procedure_repair_balm",
    name: "Post-Procedure Repair Balm",
    category: "Hydrate",
    size: "50 ml",
    priceThb: 1890,
    refillThb: 1700,
    oncePriceId: "post_procedure_repair_balm_once",
    refillPriceId: "post_procedure_repair_balm_refill",
    note: "Soothes and rebuilds the skin barrier during facelift and thread-lift recovery.",
    actives: ["Ceramides", "Panthenol"],
  },
  {
    id: "mineral_fluid_spf50",
    name: "Mineral Fluid SPF 50",
    category: "Protect",
    size: "50 ml",
    priceThb: 1590,
    refillThb: 1430,
    oncePriceId: "mineral_fluid_spf50_once",
    refillPriceId: "mineral_fluid_spf50_refill",
    note: "Invisible zinc finish for daily sun protection after botox, filler and facelift procedures.",
    actives: ["Zinc oxide"],
  },
];

export const formatThb = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

export function findProductByPriceId(priceId: string | null | undefined) {
  if (!priceId) return undefined;
  return SKINCARE_PRODUCTS.find(
    (p) => p.oncePriceId === priceId || p.refillPriceId === priceId,
  );
}
