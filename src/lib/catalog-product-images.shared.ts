export type CatalogProductKind = "filler" | "skincare";

export type CatalogProductImageRow = {
  product_id: string;
  kind: CatalogProductKind;
  original_path: string | null;
  final_path: string | null;
  updated_at: string;
};

export type BackgroundPresetId = "warm-stone" | "charcoal-gold" | "clean-white" | "soft-rose";

export type BackgroundPreset = {
  id: BackgroundPresetId;
  label: string;
  /** Solid base colour the product is composited onto. */
  color: string;
  /** Faint accent used for the vignette/highlight so the frame doesn't look flat. */
  accent: string;
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "warm-stone", label: "Warm stone", color: "#cdbda6", accent: "#e7dac2" },
  { id: "charcoal-gold", label: "Charcoal & gold", color: "#221f1a", accent: "#c9a96a" },
  { id: "clean-white", label: "Clean white", color: "#ffffff", accent: "#f1ece3" },
  { id: "soft-rose", label: "Soft rose", color: "#f3dcd9", accent: "#ffffff" },
];

/** Square canvas the final composited product photo is exported at. */
export const PRODUCT_IMAGE_SIZE = 1600;
