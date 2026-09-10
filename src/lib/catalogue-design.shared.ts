export const CATALOGUE_PRESETS = [
  "charcoal-gold",
  "cream-studio",
  "pearl-white",
  "midnight-gold",
] as const;

export type CataloguePreset = (typeof CATALOGUE_PRESETS)[number];

export const DEFAULT_CATALOGUE_PRESET: CataloguePreset = "charcoal-gold";
