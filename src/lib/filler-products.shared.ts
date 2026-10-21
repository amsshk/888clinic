/**
 * Filler product photos with charcoal-and-gold studio backgrounds,
 * served from `public/images/fillers/charcoal`. Source PNGs are retained.
 * `slug` is the stable key used to associate an admin-edited photo (stored in
 * `catalog_product_images`) with a filler product — it must not change once
 * an admin has saved an edited photo for that product.
 */
export type FillerProduct = {
  slug: string;
  nameEn: string;
  staticImage: string;
};

export const FILLER_PRODUCTS: FillerProduct[] = [
  {
    slug: "neuramis-deep-cross-linked",
    nameEn: "Neuramis Deep Cross-Linked",
    staticImage: "/images/fillers/charcoal/01-neuramis-deep-cross-linked.webp",
  },
  {
    slug: "neuramis-deep-lidocaine",
    nameEn: "Neuramis Deep Lidocaine",
    staticImage: "/images/fillers/charcoal/02-neuramis-deep-lidocaine.webp",
  },
  {
    slug: "neuramis-volume",
    nameEn: "Neuramis Volume",
    staticImage: "/images/fillers/charcoal/03-neuramis-volume.webp",
  },
  {
    slug: "restylane-skinboosters-vital-light",
    nameEn: "Restylane Skin Booster Vital Light",
    staticImage: "/images/fillers/charcoal/04-restylane-skinboosters-vital-light.webp",
  },
  {
    slug: "restylane-perlane-lyft",
    nameEn: "Restylane Perlane Lyft",
    staticImage: "/images/fillers/charcoal/05-restylane-perlane-lyft.webp",
  },
  {
    slug: "juvederm-volbella",
    nameEn: "Juvederm Volbella",
    staticImage: "/images/fillers/charcoal/06-juvederm-volbella.webp",
  },
  {
    slug: "juvederm-voluma-2",
    nameEn: "Juvederm Voluma 2",
    staticImage: "/images/fillers/charcoal/07-juvederm-voluma-2.webp",
  },
];

export function fillerImageBySlug(slug: string): string | undefined {
  return FILLER_PRODUCTS.find((p) => p.slug === slug)?.staticImage;
}

export function fillerImageByName(nameEn: string): string | undefined {
  return FILLER_PRODUCTS.find((p) => p.nameEn === nameEn)?.staticImage;
}
