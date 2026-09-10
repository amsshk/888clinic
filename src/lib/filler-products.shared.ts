/**
 * Genuine filler product photography, served from `public/images/fillers`.
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
    staticImage: "/images/fillers/01-neuramis-deep-cross-linked.png",
  },
  {
    slug: "neuramis-deep-lidocaine",
    nameEn: "Neuramis Deep Lidocaine",
    staticImage: "/images/fillers/02-neuramis-deep-lidocaine.png",
  },
  {
    slug: "neuramis-volume",
    nameEn: "Neuramis Volume",
    staticImage: "/images/fillers/03-neuramis-volume.png",
  },
  {
    slug: "restylane-skinboosters-vital-light",
    nameEn: "Restylane Skin Booster Vital Light",
    staticImage: "/images/fillers/04-restylane-skinboosters-vital-light.png",
  },
  {
    slug: "restylane-perlane-lyft",
    nameEn: "Restylane Perlane Lyft",
    staticImage: "/images/fillers/05-restylane-perlane-lyft.png",
  },
  {
    slug: "juvederm-volbella",
    nameEn: "Juvederm Volbella",
    staticImage: "/images/fillers/06-juvederm-volbella.png",
  },
  {
    slug: "juvederm-voluma-2",
    nameEn: "Juvederm Voluma 2",
    staticImage: "/images/fillers/07-juvederm-voluma-2.png",
  },
];

export function fillerImageBySlug(slug: string): string | undefined {
  return FILLER_PRODUCTS.find((p) => p.slug === slug)?.staticImage;
}

export function fillerImageByName(nameEn: string): string | undefined {
  return FILLER_PRODUCTS.find((p) => p.nameEn === nameEn)?.staticImage;
}
