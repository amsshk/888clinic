export type ResultCategory = "Facelift / Thread Lift" | "Dermal Filler";

export type BeforeAfterItem = {
  id: string;
  url: string;
  category: ResultCategory;
  zone: string;
  description: string;
  alt: string;
};

/**
 * Only publish one entry per real patient result image.
 * All images, treatment descriptions, and patient consent must be verified
 * by the clinic before publication.
 */
export const BEFORE_AFTER: BeforeAfterItem[] = [
  {
    id: "chin-result",
    url: "/images/ba-chin.jpg",
    category: "Dermal Filler",
    zone: "Chin",
    description:
      "Before and after a chin treatment at 888clinic. Individual outcomes vary and the appropriate treatment is confirmed during consultation.",
    alt: "Before and after photographs of a chin treatment at 888clinic",
  },
  {
    id: "lips-result",
    url: "/images/ba-lips.jpg",
    category: "Dermal Filler",
    zone: "Lips",
    description:
      "Before and after a lip treatment at 888clinic. Individual outcomes vary and the appropriate treatment is confirmed during consultation.",
    alt: "Before and after photographs of a lip treatment at 888clinic",
  },
  {
    id: "lift-result",
    url: "/images/ba-lift.jpg",
    category: "Facelift / Thread Lift",
    zone: "Face & jawline",
    description:
      "Before and after a facial treatment at 888clinic. Individual outcomes vary and the appropriate treatment is confirmed during consultation.",
    alt: "Before and after photographs of a facial treatment at 888clinic",
  },
];

export const RESULT_CATEGORIES: ResultCategory[] = [
  "Facelift / Thread Lift",
  "Dermal Filler",
];
