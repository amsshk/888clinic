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

export const SKINCARE_PRODUCTS: SkincareProduct[] = [
  {
    id: "gentle_gel_cleanser",
    name: "Gentle Gel Cleanser",
    category: "Cleanse",
    size: "150 ml",
    priceThb: 1190,
    refillThb: 1070,
    oncePriceId: "gentle_gel_cleanser_once",
    refillPriceId: "gentle_gel_cleanser_refill",
    note: "Non-stripping daily wash for reactive and acne-prone skin.",
    actives: ["Glycerin", "Panthenol"],
  },
  {
    id: "clarifying_acid_wash",
    name: "Clarifying Acid Wash",
    category: "Cleanse",
    size: "150 ml",
    priceThb: 1390,
    refillThb: 1250,
    oncePriceId: "clarifying_acid_wash_once",
    refillPriceId: "clarifying_acid_wash_refill",
    note: "Salicylic cleanser for congested T-zones and body acne.",
    actives: ["2% Salicylic acid"],
  },
  {
    id: "vitamin_c_15_serum",
    name: "Vitamin C 15 Serum",
    category: "Treat",
    size: "30 ml",
    priceThb: 2590,
    refillThb: 2330,
    oncePriceId: "vitamin_c_15_serum_once",
    refillPriceId: "vitamin_c_15_serum_refill",
    note: "Brightens dullness and post-inflammatory marks.",
    actives: ["15% L-ascorbic", "Ferulic"],
  },
  {
    id: "retinal_005_night",
    name: "Retinal 0.05 Night",
    category: "Treat",
    size: "30 ml",
    priceThb: 2990,
    refillThb: 2690,
    oncePriceId: "retinal_005_night_once",
    refillPriceId: "retinal_005_night_refill",
    note: "Encapsulated retinaldehyde for texture and fine lines.",
    actives: ["Retinaldehyde", "Squalane"],
  },
  {
    id: "azelaic_redness_cream",
    name: "Azelaic Redness Cream",
    category: "Treat",
    size: "30 ml",
    priceThb: 1990,
    refillThb: 1790,
    oncePriceId: "azelaic_redness_cream_once",
    refillPriceId: "azelaic_redness_cream_refill",
    note: "Calms rosacea flushing and evens tone.",
    actives: ["15% Azelaic acid"],
  },
  {
    id: "barrier_repair_moisturiser",
    name: "Barrier Repair Moisturiser",
    category: "Hydrate",
    size: "50 ml",
    priceThb: 1690,
    refillThb: 1520,
    oncePriceId: "barrier_repair_moisturiser_once",
    refillPriceId: "barrier_repair_moisturiser_refill",
    note: "Ceramide-rich cream for compromised barriers.",
    actives: ["Ceramides", "Cholesterol"],
  },
  {
    id: "hydra_peptide_lotion",
    name: "Hydra Peptide Lotion",
    category: "Hydrate",
    size: "50 ml",
    priceThb: 1890,
    refillThb: 1700,
    oncePriceId: "hydra_peptide_lotion_once",
    refillPriceId: "hydra_peptide_lotion_refill",
    note: "Lightweight hydration for oily and combination skin.",
    actives: ["Peptides", "HA"],
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
    note: "Invisible zinc finish, safe post-procedure.",
    actives: ["Zinc oxide"],
  },
  {
    id: "tinted_shield_spf50",
    name: "Tinted Shield SPF 50",
    category: "Protect",
    size: "40 ml",
    priceThb: 1750,
    refillThb: 1570,
    oncePriceId: "tinted_shield_spf50_once",
    refillPriceId: "tinted_shield_spf50_refill",
    note: "Iron-oxide tint for melasma and pigment control.",
    actives: ["Zinc", "Iron oxides"],
  },
];

export const formatThb = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

export function findProductByPriceId(priceId: string | null | undefined) {
  if (!priceId) return undefined;
  return SKINCARE_PRODUCTS.find(
    (p) => p.oncePriceId === priceId || p.refillPriceId === priceId,
  );
}
